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
socket.on('join-room', ({ roomId, playerName }) => {
  socket.join(roomId);
  
    if (!gameRooms.has(roomId)) {
      gameRooms.set(roomId, {
        players: [],
        gameState: {
          board: [],
          currentTurn: null,
          turnNumber: 1
        },
        setupReady: [],
        knockedThisRound: []
      });
    }
    const room = gameRooms.get(roomId);
    
    // Add player if not already in room (max 2 players)
    if (room.players.length < 2 && !room.players.find(p => p.id === socket.id)) {
      room.players.push({
        id: socket.id,
        name: playerName,
        hand: [],
        deck: []
      });
    }

    // Send current room state to the joining player
    socket.emit('room-joined', {
      roomId,
      players: room.players,
      gameState: room.gameState
    });

    // Notify other players in room
    socket.to(roomId).emit('player-joined', {
      playerId: socket.id,
      playerName
    });

    console.log(`${playerName} joined room ${roomId}`);
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

// Handle setup completion
socket.on('setup-done', ({ roomId }) => {
  const room = gameRooms.get(roomId);
  if (!room) return;
  
  // Add player to ready list
  if (!room.setupReady.includes(socket.id)) {
    room.setupReady.push(socket.id);
  }
  
  // Check if both players are ready
  if (room.setupReady.length === 2) {
    // Randomize starting player
    const randomIndex = Math.floor(Math.random() * 2);
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
  }
});

// Handle turn change
socket.on('end-turn', ({ roomId }) => {
  const room = gameRooms.get(roomId);
  if (!room) return;
  
  // Track who knocked this round
  if (!room.knockedThisRound.includes(socket.id)) {
    room.knockedThisRound.push(socket.id);
  }
  
  // Find current player index
  const currentIndex = room.players.findIndex(p => p.id === room.gameState.currentTurn);
  // Switch to next player
  const nextIndex = (currentIndex + 1) % room.players.length;
  room.gameState.currentTurn = room.players[nextIndex].id;
  
  // Check if both players have knocked (round complete)
  if (room.knockedThisRound.length === 2) {
    room.gameState.turnNumber++;
    room.knockedThisRound = [];
    
    // Notify all players of new turn number
    io.to(roomId).emit('turn-number-updated', {
      turnNumber: room.gameState.turnNumber
    });
  }
  
  io.to(roomId).emit('turn-changed', {
    currentTurn: room.gameState.currentTurn
  });
});

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Remove player from all rooms
    gameRooms.forEach((room, roomId) => {
      const playerIndex = room.players.findIndex(p => p.id === socket.id);
      if (playerIndex !== -1) {
        const player = room.players[playerIndex];
        room.players.splice(playerIndex, 1);
        
        // Notify other players
        socket.to(roomId).emit('player-left', {
          playerId: socket.id,
          playerName: player.name
        });

        // Clean up empty rooms
        if (room.players.length === 0) {
          gameRooms.delete(roomId);
        }
      }
    });
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
