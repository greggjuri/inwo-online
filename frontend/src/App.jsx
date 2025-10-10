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

  return (
    <SocketProvider>
      <div className="App">
        {gameState === 'lobby' && (
          <Lobby
            onJoinRoom={(room, name) => {
              setRoomId(room);
              setPlayerName(name);
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
          />
        )}
      </div>
    </SocketProvider>
  );
}

export default App;