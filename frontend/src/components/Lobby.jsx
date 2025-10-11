import React, { useState } from 'react';
import { useSocket } from '../contexts/SocketContext';
import './Lobby.css';

const Lobby = ({ onJoinRoom }) => {
  const [roomId, setRoomId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const { connected } = useSocket();

  const handleJoin = (e) => {
    e.preventDefault();
    if (roomId && playerName) {
      onJoinRoom(roomId, playerName);
    }
  };

  const generateRoomId = () => {
    const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    setRoomId(newRoomId);
    
    // Add a little visual feedback
    const button = document.activeElement;
    if (button) {
      button.style.transform = 'scale(0.95)';
      setTimeout(() => {
        button.style.transform = '';
      }, 100);
    }
  };

  return (
    <div className="lobby">
      <div className="connection-status">
        <div className={`connection-dot ${connected ? 'connected' : 'disconnected'}`}></div>
        <span>{connected ? 'Connected' : 'Connecting...'}</span>
      </div>

      <div className="lobby-container">
        <h1>ILLUMINATI</h1>
        <p className="lobby-subtitle">New World Order™</p>
        
        <form className="lobby-form" onSubmit={handleJoin}>
          <div className="form-group">
            <label htmlFor="playerName">Your Name</label>
            <input
              id="playerName"
              type="text"
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              required
              maxLength={20}
            />
          </div>

          <div className="form-group">
            <label htmlFor="roomId">Room Code</label>
            <div className="input-group">
              <input
                id="roomId"
                type="text"
                placeholder="Enter room code"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                required
                maxLength={6}
                style={{ textTransform: 'uppercase' }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={generateRoomId}
              >
                <span>Generate</span>
              </button>
            </div>
          </div>

          <div className="divider">
            <span>Ready to conspire?</span>
          </div>

          <button type="submit" className="btn btn-primary" disabled={!connected}>
            <span>{connected ? 'Join Game' : 'Connecting...'}</span>
          </button>
        </form>

        <div className="lobby-info">
          <p>🔺 Create or join a conspiracy</p>
          <p>🎯 Build your secret deck of power</p>
          <p>👁️ Share the code to recruit co-conspirators</p>
        </div>
      </div>
    </div>
  );
};

export default Lobby;
