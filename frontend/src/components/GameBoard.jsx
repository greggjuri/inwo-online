import React, { useEffect, useState } from 'react';
import { useSocket } from '../contexts/SocketContext';
import Card from './Card';
import './GameBoard.css';

const GameBoard = ({ roomId, playerName, playerDeck }) => {
  const { socket } = useSocket();
  const [players, setPlayers] = useState([]);
  const [hand, setHand] = useState([]);
  const [deck, setDeck] = useState([...playerDeck]);
  const [playArea, setPlayArea] = useState([]);
  const [opponentPlayArea, setOpponentPlayArea] = useState([]);
  const [diceResult, setDiceResult] = useState(null);

  useEffect(() => {
    if (!socket) return;

    // Join the room
    socket.emit('join-room', { roomId, playerName });

    // Send deck to server
    socket.emit('set-deck', { roomId, deck: playerDeck });

    // Draw starting hand (5 cards)
    drawCards(5);

    // Listen for room joined confirmation
    socket.on('room-joined', ({ players: roomPlayers }) => {
      setPlayers(roomPlayers);
    });

    // Listen for other players joining
    socket.on('player-joined', ({ playerId, playerName: newPlayerName }) => {
      setPlayers(prev => {
        const exists = prev.find(p => p.id === playerId);
        if (exists) return prev;
        return [...prev, { id: playerId, name: newPlayerName }];
      });
    });

    // Listen for card movements from other players
    socket.on('card-moved', ({ playerId, card, to, position }) => {
      if (to === 'play-area') {
        setOpponentPlayArea(prev => [...prev, { ...card, position, playerId }]);
      }
    });

    // Listen for dice rolls
    socket.on('dice-rolled', ({ playerId, result, sides }) => {
      setDiceResult({ playerId, result, sides });
      setTimeout(() => setDiceResult(null), 3000);
    });

    // Listen for players leaving
    socket.on('player-left', ({ playerId }) => {
      setPlayers(prev => prev.filter(p => p.id !== playerId));
    });

    return () => {
      socket.off('room-joined');
      socket.off('player-joined');
      socket.off('card-moved');
      socket.off('dice-rolled');
      socket.off('player-left');
    };
  }, [socket, roomId, playerName, playerDeck]);

  const drawCards = (count) => {
    if (deck.length === 0) return;
    
    const cardsToDraw = deck.slice(0, Math.min(count, deck.length));
    setHand(prev => [...prev, ...cardsToDraw]);
    setDeck(prev => prev.slice(count));
  };

  const playCard = (card, index) => {
    // Remove from hand
    setHand(prev => prev.filter((_, i) => i !== index));
    
    // Add to play area
    const position = { x: Math.random() * 500, y: Math.random() * 300 };
    setPlayArea(prev => [...prev, { ...card, position }]);
    
    // Notify other players
    socket.emit('move-card', {
      roomId,
      card,
      from: 'hand',
      to: 'play-area',
      position
    });
  };

  const returnToHand = (card, index) => {
    setPlayArea(prev => prev.filter((_, i) => i !== index));
    setHand(prev => [...prev, card]);
  };

  const rollDice = (sides = 6) => {
    socket.emit('roll-dice', { roomId, sides });
  };

  const shuffleDeck = () => {
    const shuffled = [...hand, ...deck, ...playArea].sort(() => Math.random() - 0.5);
    setDeck(shuffled);
    setHand([]);
    setPlayArea([]);
    drawCards(5);
  };

  return (
    <div className="game-board-container">
      {/* Header */}
      <div className="game-header">
        <div className="room-info">
          <h2>Room: {roomId}</h2>
          <div className="players">
            {players.map(player => (
              <span key={player.id} className="player-badge">
                {player.name} {player.id === socket?.id ? '(You)' : ''}
              </span>
            ))}
          </div>
        </div>

        <div className="game-controls">
          <button onClick={() => drawCards(1)}>
            Draw Card ({deck.length} left)
          </button>
          <button onClick={() => rollDice(6)}>🎲 Roll D6</button>
          <button onClick={() => rollDice(10)}>🎲 Roll D10</button>
          <button onClick={shuffleDeck}>🔄 Reset & Shuffle</button>
        </div>
      </div>

      {/* Dice Result Popup */}
      {diceResult && (
        <div className="dice-popup">
          <div className="dice-result">
            🎲 {diceResult.result} 🎲
          </div>
        </div>
      )}

      {/* Play Area */}
      <div className="play-area">
        <div className="opponent-area">
          <h3>Opponent's Cards ({opponentPlayArea.length})</h3>
          <div className="cards-container">
            {opponentPlayArea.map((card, index) => (
              <div
                key={`opp-${index}`}
                className="played-card"
                style={{
                  left: card.position.x,
                  top: card.position.y
                }}
              >
                <Card card={card} size="small" draggable={false} />
              </div>
            ))}
          </div>
        </div>

        <div className="player-area">
          <h3>Your Cards ({playArea.length})</h3>
          <div className="cards-container">
            {playArea.map((card, index) => (
              <div
                key={`play-${index}`}
                className="played-card"
                style={{
                  left: card.position.x,
                  top: card.position.y
                }}
              >
                <Card 
                  card={card} 
                  size="small"
                  onDoubleClick={() => returnToHand(card, index)}
                />
              </div>
            ))}
          </div>
          {playArea.length === 0 && (
            <div className="empty-area">
              <p>Click cards from your hand to play them here</p>
            </div>
          )}
        </div>
      </div>

      {/* Hand */}
      <div className="hand">
        <h3>Your Hand ({hand.length} cards)</h3>
        <div className="hand-cards">
          {hand.map((card, index) => (
            <div key={`hand-${index}`} className="hand-card">
              <Card
                card={card}
                size="small"
                onClick={() => playCard(card, index)}
              />
            </div>
          ))}
          {hand.length === 0 && (
            <div className="empty-hand">
              <p>No cards in hand. Draw some cards!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameBoard;