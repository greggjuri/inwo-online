import React, { useState } from 'react';
import { SocketProvider } from './contexts/SocketContext';
import Lobby from './components/Lobby';
import DeckBuilder from './components/DeckBuilder';
import GameBoard from './components/GameBoard';
import './App.css';

function App() {
  const [gameState, setGameState] = useState('lobby'); // 'lobby', 'deck-builder', 'game'
  const [roomId, setRoomId] = useState(null);
  const [playerName, setPlayerName] = useState('');
  const [playerDeck, setPlayerDeck] = useState([]);
  const [playerCount, setPlayerCount] = useState(2); // New state for player count

  return (
    <SocketProvider>
      <div className="App">
        {gameState === 'lobby' && (
          <Lobby
            onJoinRoom={(room, name, count) => {
              setRoomId(room);
              setPlayerName(name);
              if (count !== undefined) {
                setPlayerCount(count); // Set player count if provided (room creator)
              }
              setGameState('deck-builder');
            }}
          />
        )}
        {gameState === 'deck-builder' && (
          <DeckBuilder
            onStartGame={(deck) => {
              setPlayerDeck(deck);
              setGameState('game');
            }}
          />
        )}
        {gameState === 'game' && (
          <GameBoard 
            roomId={roomId} 
            playerName={playerName}
            playerDeck={playerDeck}
            playerCount={playerCount} // Pass player count to GameBoard
          />
        )}
      </div>
    </SocketProvider>
  );
}

export default App;