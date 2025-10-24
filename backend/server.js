import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Storage for shared decks (in-memory for now)
const sharedDecks = new Map();

// REST API endpoints for deck management
app.get('/api/decks', (req, res) => {
  res.json(Array.from(sharedDecks.values()));
});

app.post('/api/decks', (req, res) => {
  const deck = {
    ...req.body,
    id: Date.now().toString(),
    savedAt: new Date().toISOString()
  };
  sharedDecks.set(deck.id, deck);
  res.json(deck);
});

app.delete('/api/decks/:id', (req, res) => {
  sharedDecks.delete(req.params.id);
  res.json({ success: true });
});

// Store active game rooms
const gameRooms = new Map();

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Create or join a room
  socket.on('join-room', ({ roomId, playerName, playerCount }) => {
    socket.join(roomId);
    
    if (!gameRooms.has(roomId)) {
      // Create new room with player count (default to 2 if not provided)
      gameRooms.set(roomId, {
        players: [],
        maxPlayers: playerCount || 2, // NEW: Store max players for the room
        gameState: {
          board: [],
          currentTurn: null,
          turnNumber: 1
        },
        setupReady: [],
        knockedThisRound: []
      });
      console.log(`Created room ${roomId} for ${playerCount || 2} players`);
    }
    
    const room = gameRooms.get(roomId);
    
    // Check if room is full
    if (room.players.length >= room.maxPlayers) {
      socket.emit('room-full', { 
        roomId, 
        maxPlayers: room.maxPlayers 
      });
      console.log(`Room ${roomId} is full (${room.maxPlayers} players)`);
      return;
    }
    
    // Add player if not already in room
    if (!room.players.find(p => p.id === socket.id)) {
      room.players.push({
        id: socket.id,
        name: playerName,
        hand: [],
        deck: []
      });
      console.log(`${playerName} joined room ${roomId} (${room.players.length}/${room.maxPlayers})`);
    }

    // Send current room state to the joining player
    socket.emit('room-joined', {
      roomId,
      players: room.players,
      maxPlayers: room.maxPlayers, // NEW: Send max players to client
      gameState: room.gameState
    });

    // Notify other players in room
    socket.to(roomId).emit('player-joined', {
      playerId: socket.id,
      playerName,
      currentPlayerCount: room.players.length,
      maxPlayers: room.maxPlayers
    });
  });

  // Handle card movements
  socket.on('move-card', ({ roomId, card, from, to, position, rotation, tokens }) => {
    socket.to(roomId).emit('card-moved', {
      playerId: socket.id,
      card,
      from,
      to,
      position,
      rotation,
      tokens
    });
  });

  // Handle card updates (rotation, tokens)
  socket.on('update-card', ({ roomId, cardIndex, rotation, tokens }) => {
    socket.to(roomId).emit('card-updated', {
      playerId: socket.id,
      cardIndex,
      rotation,
      tokens
    });
  });

  // Handle card position updates
  socket.on('update-card-position', ({ roomId, cardIndex, position }) => {
    socket.to(roomId).emit('card-position-updated', {
      playerId: socket.id,
      cardIndex,
      position
    });
  });

  // Handle card removal
  socket.on('remove-card', ({ roomId, cardIndex }) => {
    socket.to(roomId).emit('card-removed', {
      playerId: socket.id,
      cardIndex
    });
  });

  // Handle deck setup
  socket.on('set-deck', ({ roomId, deck }) => {
    const room = gameRooms.get(roomId);
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (player) {
      player.deck = deck;
      socket.to(roomId).emit('player-deck-ready', {
        playerId: socket.id
      });
    }
  });

  // Handle hand updates (send card counts to opponents)
  socket.on('hand-update', ({ roomId, handCounts }) => {
    socket.to(roomId).emit('opponent-hand-update', {
      playerId: socket.id,
      handCounts
    });
  });

  // Handle turn changes (knock) - FIXED FOR MULTIPLAYER
  socket.on('knock', ({ roomId }) => {
    const room = gameRooms.get(roomId);
    if (!room) return;

    // Add current player to knocked list
    if (!room.knockedThisRound.includes(socket.id)) {
      room.knockedThisRound.push(socket.id);
    }

    console.log(`Player ${socket.id} knocked in room ${roomId}. Knocked: ${room.knockedThisRound.length}/${room.maxPlayers}`);

    // Find next player (cycle through all players)
    const currentPlayerIndex = room.players.findIndex(p => p.id === socket.id);
    let nextPlayerIndex = (currentPlayerIndex + 1) % room.players.length;
    
    // If we've cycled back to a player who already knocked this round,
    // it means everyone has knocked - start new round
    if (room.knockedThisRound.includes(room.players[nextPlayerIndex].id)) {
      // All players have knocked - new round starts
      room.knockedThisRound = [];
      room.gameState.turnNumber += 1;
      
      console.log(`Round complete in room ${roomId}. Starting turn ${room.gameState.turnNumber}`);
      
      io.to(roomId).emit('turn-number-updated', {
        turnNumber: room.gameState.turnNumber
      });
    }

    // Set next player's turn
    room.gameState.currentTurn = room.players[nextPlayerIndex].id;
    
    console.log(`Turn changed to player ${nextPlayerIndex} (${room.players[nextPlayerIndex].name})`);
    
    io.to(roomId).emit('turn-changed', {
      currentTurn: room.gameState.currentTurn
    });
  });

  // Handle dice roll - FIXED to roll TWO dice
  socket.on('roll-dice', ({ roomId, sides }) => {
    const dice1 = Math.floor(Math.random() * sides) + 1;
    const dice2 = Math.floor(Math.random() * sides) + 1;
    
    io.to(roomId).emit('dice-rolled', {
      playerId: socket.id,
      dice1,
      dice2
    });
  });

  // Handle closing dice popup
  socket.on('close-dice', ({ roomId }) => {
    socket.to(roomId).emit('dice-closed');
  });

  // Handle NWO card placement
  socket.on('play-nwo', ({ roomId, color, card }) => {
    socket.to(roomId).emit('nwo-played', { color, card });
  });

  // Handle NWO card removal
  socket.on('remove-nwo', ({ roomId, color }) => {
    socket.to(roomId).emit('nwo-removed', { color });
  });

  // Handle showing card to all players
  socket.on('show-card-to-all', ({ roomId, card }) => {
    socket.to(roomId).emit('show-card-to-all', {
      playerId: socket.id,
      card
    });
  });

  // Handle setup completion - UPDATED for multiple players
  socket.on('setup-done', ({ roomId }) => {
    const room = gameRooms.get(roomId);
    if (!room) return;
    
    // CRITICAL: Prevent same player from clicking Done multiple times
    if (room.setupReady.includes(socket.id)) {
      console.log(`Player ${socket.id} already marked as ready - ignoring duplicate click`);
      return; // Exit early if player already clicked Done
    }
    
    // Add player to ready list
    room.setupReady.push(socket.id);
    console.log(`Player ${socket.id} marked ready in room ${roomId} (${room.setupReady.length}/${room.maxPlayers})`);
    
    // Check if all players are ready (UPDATED)
    if (room.setupReady.length === room.maxPlayers) {
      // Randomize starting player
      const randomIndex = Math.floor(Math.random() * room.maxPlayers);
      const startingPlayerId = room.players[randomIndex].id;
      room.gameState.currentTurn = startingPlayerId;
      room.gameState.turnNumber = 1;
      room.knockedThisRound = [];
      
      // Notify all players
      io.to(roomId).emit('game-started', {
        currentTurn: startingPlayerId,
        startingPlayerName: room.players[randomIndex].name,
        turnNumber: 1
      });
      
      console.log(`Game started in room ${roomId} with ${room.maxPlayers} players. ${room.players[randomIndex].name} goes first!`);
    } else {
      // Notify players waiting
      io.to(roomId).emit('setup-progress', {
        readyCount: room.setupReady.length,
        maxPlayers: room.maxPlayers
      });
    }
  });

  // Handle player disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Remove player from all rooms
    gameRooms.forEach((room, roomId) => {
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        const playerName = room.players[playerIndex].name;
        room.players.splice(playerIndex, 1);
        room.setupReady = room.setupReady.filter(id => id !== socket.id);
        
        // Notify remaining players
        socket.to(roomId).emit('player-left', {
          playerId: socket.id,
          playerName,
          remainingPlayers: room.players.length
        });
        
        // Delete room if empty
        if (room.players.length === 0) {
          gameRooms.delete(roomId);
          console.log(`Room ${roomId} deleted (empty)`);
        }
      }
    });
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
