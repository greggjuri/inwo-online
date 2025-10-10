import React, { useState } from 'react';

const Lobby = ({ onJoinRoom }) => {
  const [roomId, setRoomId] = useState('');
  const [playerName, setPlayerName] = useState('');

  const handleJoin = (e) => {
    e.preventDefault();
    if (roomId && playerName) {
      onJoinRoom(roomId, playerName);
    }
  };

  const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  return (
    <div className="lobby">
      <h1>INWO Online</h1>
      <form onSubmit={handleJoin}>
        <div>
          <input
            type="text"
            placeholder="Your name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            required
          />
        </div>
        <div>
          <input
            type="text"
            placeholder="Room ID"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value.toUpperCase())}
            required
          />
          <button
            type="button"
            onClick={() => setRoomId(generateRoomId())}
          >
            Generate Room
          </button>
        </div>
        <button type="submit">Join Game</button>
      </form>
    </div>
  );
};

export default Lobby;