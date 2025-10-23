import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../contexts/SocketContext';
import './Lobby.css';

const Lobby = ({ onJoinRoom }) => {
  const [roomId, setRoomId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [playerCount, setPlayerCount] = useState(2);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const { connected } = useSocket();
  const audioRef = useRef(null);
  const fadeIntervalRef = useRef(null);
  const audioStartedRef = useRef(false);
  
  const tickerMessages = [
    "AGENT PHOENIX HAS ENTERED THE NETWORK...",
    "NEW CELL ESTABLISHED IN SECTOR 7-ALPHA...",
    "OPERATION BLACKOUT: PHASE 2 INITIATED...",
    "GLOBAL INFLUENCE EXPANDING: +3.7%...",
    "ENCRYPTED TRANSMISSION RECEIVED FROM THE COUNCIL...",
    "ASSET DEPLOYMENT SUCCESSFUL IN REGION 4...",
    "SURVEILLANCE NETWORK UPGRADED: LEVEL 9...",
    "SHADOW GOVERNMENT PROTOCOLS ACTIVATED..."
  ];

  // Initialize and play audio on mount
  useEffect(() => {
    audioRef.current = new Audio('/inwo/audio/Oculus_Omnia_Videns.mp3');
    audioRef.current.loop = true;
    audioRef.current.volume = 0.6;
    
    const playAudio = async () => {
      try {
        await audioRef.current.play();
        audioStartedRef.current = true;
      } catch (error) {
        console.log('Audio autoplay prevented - will play on first interaction');
      }
    };
    
    playAudio();

    return () => {
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const startAudioOnInteraction = async () => {
    if (!audioStartedRef.current && audioRef.current) {
      try {
        await audioRef.current.play();
        audioStartedRef.current = true;
      } catch (error) {
        console.log('Could not start audio:', error);
      }
    }
  };

  const fadeOutAudio = (duration = 1500) => {
    return new Promise((resolve) => {
      if (!audioRef.current) {
        resolve();
        return;
      }

      const startVolume = audioRef.current.volume;
      const fadeStep = startVolume / (duration / 50);

      fadeIntervalRef.current = setInterval(() => {
        if (audioRef.current.volume > fadeStep) {
          audioRef.current.volume -= fadeStep;
        } else {
          audioRef.current.volume = 0;
          audioRef.current.pause();
          clearInterval(fadeIntervalRef.current);
          resolve();
        }
      }, 50);
    });
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (roomId && playerName) {
      await fadeOutAudio(1500);
      onJoinRoom(roomId, playerName, isCreatingRoom ? playerCount : undefined);
    }
  };

  const generateRoomId = () => {
    const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    setRoomId(newRoomId);
    setIsCreatingRoom(true);
    startAudioOnInteraction();
  };

  const handleRoomIdChange = (e) => {
    setRoomId(e.target.value.toUpperCase());
    setIsCreatingRoom(e.target.value.length === 0);
  };

  return (
    <div className="lobby" onClick={startAudioOnInteraction}>
      {/* Security Clearance Banner */}
      <div className="top-banner">
        <div className="clearance-level">
          <span className="clearance-icon">🔐</span>
          SECURITY CLEARANCE: LEVEL 0 - INITIATE
        </div>
        <div className="connection-status">
          <div className={`status-dot ${connected ? 'connected' : 'disconnected'}`}></div>
          <span>{connected ? 'SECURE CHANNEL ESTABLISHED' : 'ESTABLISHING LINK...'}</span>
        </div>
      </div>

      {/* Main Split Container */}
      <div className="main-container">
        {/* Left Panel - Eye of Providence */}
        <div className="left-panel">
          <div className="eye-container">
            {/* Pyramid SVG */}
            <svg className="pyramid-svg" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="pyramidGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" style={{stopColor: '#8B0000', stopOpacity: 0.9}} />
                  <stop offset="100%" style={{stopColor: '#450000', stopOpacity: 1}} />
                </linearGradient>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              
              {/* Pyramid body */}
              <path d="M 150 30 L 270 250 L 30 250 Z" 
                    fill="url(#pyramidGrad)" 
                    stroke="#ff8800" 
                    strokeWidth="2"
                    filter="url(#glow)"/>
              
              {/* Top capstone */}
              <path d="M 150 30 L 190 90 L 110 90 Z" 
                    fill="#ffcc00" 
                    stroke="#ff8800" 
                    strokeWidth="2"
                    opacity="0.9"
                    filter="url(#glow)"/>
              
              {/* Eye */}
              <ellipse cx="150" cy="150" rx="45" ry="30" fill="#1a1a1a" stroke="#ffcc00" strokeWidth="3"/>
              <circle cx="150" cy="150" r="20" fill="#ffcc00" opacity="0.9">
                <animate attributeName="opacity" values="0.9;1;0.9" dur="3s" repeatCount="indefinite"/>
              </circle>
              <circle cx="150" cy="150" r="10" fill="#1a1a1a"/>
              
              {/* Rays */}
              {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle, i) => {
                const rad = (angle * Math.PI) / 180;
                const x1 = 150 + Math.cos(rad) * 55;
                const y1 = 150 + Math.sin(rad) * 35;
                const x2 = 150 + Math.cos(rad) * 90;
                const y2 = 150 + Math.sin(rad) * 60;
                return (
                  <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} 
                        stroke="#ffcc00" strokeWidth="2" opacity="0.6">
                    <animate attributeName="opacity" 
                             values="0.3;0.8;0.3" 
                             dur="4s" 
                             begin={`${i * 0.3}s`}
                             repeatCount="indefinite"/>
                  </line>
                );
              })}
            </svg>

            {/* Orbiting Symbols */}
            <div className="orbit-container">
              {['△', '☥', '⚡', '☠', '✦', '◉'].map((symbol, i) => (
                <div 
                  key={i} 
                  className={`orbiting-symbol orbit-${i % 3}`}
                  style={{animationDelay: `${i * -1.3}s`}}
                >
                  {symbol}
                </div>
              ))}
            </div>
          </div>

          {/* Mystical Text */}
          <div className="mystic-text">
            <p className="latin-text">NOVUS ORDO</p>
            <p className="latin-subtext">New Order</p>
          </div>
        </div>

        {/* Center Panel - Induction Form */}
        <div className="center-panel">
          <div className="form-container">
            <div className="induction-header">
              <div className="title-eye">👁️</div>
              <h1 className="induction-title">ILLUMINATI</h1>
              <div className="subtitle-container">
                <span className="induction-subtitle">INDUCTION PROTOCOL</span>
                <div className="stamp">
                  <div className="stamp-inner">
                    TOP<br/>SECRET
                  </div>
                </div>
              </div>
            </div>

            <form className="lobby-form" onSubmit={handleJoin}>
              {/* Codename Input */}
              <div className="form-group">
                <label htmlFor="playerName" className="form-label">
                  <span className="label-icon">👤</span>
                  OPERATIVE CODENAME
                  <span className="required">*MANDATORY</span>
                </label>
                <div className="input-wrapper">
                  <input
                    id="playerName"
                    type="text"
                    placeholder="Enter your alias..."
                    value={playerName}
                    onChange={(e) => {
                      setPlayerName(e.target.value);
                      startAudioOnInteraction();
                    }}
                    required
                    maxLength={20}
                    className="form-input"
                  />
                  <div className="input-stamp">✓</div>
                </div>
              </div>

              {/* Cell Designation Input */}
              <div className="form-group">
                <label htmlFor="roomId" className="form-label">
                  <span className="label-icon">🔑</span>
                  CELL DESIGNATION CODE
                  <span className="required">*CLASSIFIED</span>
                </label>
                <div className="input-group">
                  <div className="input-wrapper input-wrapper-flex">
                    <input
                      id="roomId"
                      type="text"
                      placeholder="Enter cipher..."
                      value={roomId}
                      onChange={handleRoomIdChange}
                      required
                      maxLength={6}
                      className="form-input"
                      style={{textTransform: 'uppercase'}}
                    />
                    <div className="classified-stamp">CLASSIFIED</div>
                  </div>
                  <button
                    type="button"
                    onClick={generateRoomId}
                    className="generate-btn"
                  >
                    RANDOMIZE<br/>CIPHER
                  </button>
                </div>
              </div>

              {/* Player Count Selection - Only show when creating a room */}
              {isCreatingRoom && roomId && (
                <div className="form-group player-count-group">
                  <label htmlFor="playerCount" className="form-label">
                    <span className="label-icon">👥</span>
                    OPERATIVE COUNT
                    <span className="required">*STRATEGIC</span>
                  </label>
                  <div className="player-count-selector">
                    {[2, 3, 4].map((count) => (
                      <button
                        key={count}
                        type="button"
                        className={`player-count-btn ${playerCount === count ? 'active' : ''}`}
                        onClick={() => {
                          setPlayerCount(count);
                          startAudioOnInteraction();
                        }}
                      >
                        <span className="count-number">{count}</span>
                        <span className="count-label">PLAYERS</span>
                      </button>
                    ))}
                  </div>
                  <div className="player-count-hint">
                    Select the number of conspirators for this operation
                  </div>
                </div>
              )}

              {/* Divider */}
              <div className="form-divider">
                <div className="divider-line"></div>
                <span className="divider-text">⬣ CONFIRM ALLEGIANCE ⬣</span>
                <div className="divider-line"></div>
              </div>

              {/* Submit Button */}
              <button 
                type="submit" 
                className="submit-btn"
                disabled={!connected}
              >
                <span className="submit-icon">👁️</span>
                {connected ? 'INITIATE INDUCTION' : 'ESTABLISHING CONNECTION...'}
                <span className="submit-icon">👁️</span>
              </button>
            </form>

            {/* Instructions */}
            <div className="lobby-instructions">
              <div className="instruction-item">
                <span className="instruction-icon">🔺</span>
                <span>Establish or infiltrate existing cell</span>
              </div>
              <div className="instruction-item">
                <span className="instruction-icon">🎴</span>
                <span>Construct your deck of influence</span>
              </div>
              <div className="instruction-item">
                <span className="instruction-icon">🤝</span>
                <span>Share cipher to recruit co-conspirators</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Eye of Providence (Mirror) */}
        <div className="right-panel">
          <div className="eye-container">
            {/* Pyramid SVG - Reversed Colors */}
            <svg className="pyramid-svg" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
              {/* Reversed color gradients */}
              <defs>
                <linearGradient id="pyramidGradRight" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" style={{stopColor: '#ffcc00', stopOpacity: 0.9}} />
                  <stop offset="100%" style={{stopColor: '#cc9900', stopOpacity: 1}} />
                </linearGradient>
                <filter id="glowRight">
                  <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              
              {/* Pyramid body - now yellow */}
              <path d="M 150 30 L 270 250 L 30 250 Z" 
                    fill="url(#pyramidGradRight)" 
                    stroke="#aa0000" 
                    strokeWidth="2"
                    filter="url(#glowRight)"/>
              
              {/* Top capstone - now red */}
              <path d="M 150 30 L 190 90 L 110 90 Z" 
                    fill="#aa0000" 
                    stroke="#ff4444" 
                    strokeWidth="2"
                    opacity="0.9"
                    filter="url(#glowRight)"/>
              
              {/* Eye - now red */}
              <ellipse cx="150" cy="150" rx="45" ry="30" fill="#1a1a1a" stroke="#aa0000" strokeWidth="3"/>
              <circle cx="150" cy="150" r="20" fill="#aa0000" opacity="0.9">
                <animate attributeName="opacity" values="0.9;1;0.9" dur="3s" repeatCount="indefinite"/>
              </circle>
              <circle cx="150" cy="150" r="10" fill="#1a1a1a"/>
              
              {/* Rays - now red */}
              {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle, i) => {
                const rad = (angle * Math.PI) / 180;
                const x1 = 150 + Math.cos(rad) * 55;
                const y1 = 150 + Math.sin(rad) * 35;
                const x2 = 150 + Math.cos(rad) * 90;
                const y2 = 150 + Math.sin(rad) * 60;
                return (
                  <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} 
                        stroke="#aa0000" strokeWidth="2" opacity="0.6">
                    <animate attributeName="opacity" 
                             values="0.3;0.8;0.3" 
                             dur="4s" 
                             begin={`${i * 0.3}s`}
                             repeatCount="indefinite"/>
                  </line>
                );
              })}
            </svg>

            {/* Orbiting Symbols (counter-clockwise for variety) */}
            <div className="orbit-container">
              {['◉', '✦', '☠', '⚡', '☥', '△'].map((symbol, i) => (
                <div 
                  key={i} 
                  className={`orbiting-symbol orbit-reverse-${i % 3}`}
                  style={{animationDelay: `${i * -1.3}s`}}
                >
                  {symbol}
                </div>
              ))}
            </div>
          </div>

          {/* Mystical Text */}
          <div className="mystic-text">
            <p className="latin-text">MUNDI</p>
            <p className="latin-subtext">Of the World</p>
          </div>
        </div>
      </div>

      {/* Bottom Ticker */}
      <div className="bottom-ticker">
        <div className="ticker-label">
          ⚠ GLOBAL NETWORK STATUS ⚠
        </div>
        <div className="ticker-content">
          <div className="ticker-scroll">
            {tickerMessages.concat(tickerMessages).map((msg, i) => (
              <span key={i} className="ticker-message">
                {msg} <span className="ticker-separator">●</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Floating Background Symbols */}
      <div className="floating-symbols">
        {['△', '◬', '☥', '⚡', '◉', '▽'].map((symbol, i) => (
          <div 
            key={i} 
            className="floating-symbol"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${i * -2}s`,
              animationDuration: `${15 + i * 3}s`
            }}
          >
            {symbol}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Lobby;
