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
          currentTurn: null
        }
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

  // Handle card movements and updates
  socket.on('move-card', ({ roomId, card, position, rotation, tokens }) => {
    const room = gameRooms.get(roomId);
    if (!room) return;

    // Broadcast card state to other players in room
    socket.to(roomId).emit('card-moved', {
      playerId: socket.id,
      card,
      position,
      rotation: rotation || 0,
      tokens: tokens || 0
    });
  });

  // Handle card removal from play area
  socket.on('card-removed', ({ roomId, cardId }) => {
    socket.to(roomId).emit('card-removed', {
      cardId
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

  // Handle drawing cards
  socket.on('draw-card', ({ roomId, cardId }) => {
    socket.to(roomId).emit('card-drawn', {
      playerId: socket.id,
      cardId
    });
  });

  // Handle dice roll
  socket.on('roll-dice', ({ roomId, sides }) => {
    const result = Math.floor(Math.random() * sides) + 1;
    io.to(roomId).emit('dice-rolled', {
      playerId: socket.id,
      result,
      sides
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