import React, { useEffect, useState } from 'react';
import { useSocket } from '../contexts/SocketContext';
import Card from './Card';
import './GameBoard.css';

const GameBoard = ({ roomId, playerName, playerDeck }) => {
  const { socket } = useSocket();
  const [players, setPlayers] = useState([]);
  const [hand, setHand] = useState([]);
  const [deck, setDeck] = useState([]);
  const [sharedPlayArea, setSharedPlayArea] = useState([]);
  const [diceResult, setDiceResult] = useState(null);
  const [draggedCard, setDraggedCard] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!socket) return;

    // Join the room
    socket.emit('join-room', { roomId, playerName });

    // Send deck to server (only once)
    socket.emit('set-deck', { roomId, deck: playerDeck });

    // Initialize deck and draw starting hand
    setDeck([...playerDeck]);
    
    // Draw starting hand after a brief delay to ensure deck is set
    setTimeout(() => {
      drawCards(5);
    }, 100);

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
    socket.on('card-moved', ({ playerId, card, to, position, rotation, tokens }) => {
      if (to === 'play-area') {
        setSharedPlayArea(prev => [...prev, { 
          ...card, 
          position, 
          playerId,
          rotation: rotation || 0,
          tokens: tokens || 0
        }]);
      }
    });

    // Listen for card updates (rotation, tokens)
    socket.on('card-updated', ({ playerId, cardIndex, rotation, tokens }) => {
      setSharedPlayArea(prev => {
        const updated = [...prev];
        if (updated[cardIndex]) {
          updated[cardIndex] = {
            ...updated[cardIndex],
            rotation: rotation !== undefined ? rotation : updated[cardIndex].rotation || 0,
            tokens: tokens !== undefined ? tokens : updated[cardIndex].tokens || 0
          };
        }
        return updated;
      });
    });

    // Listen for card position updates
    socket.on('card-position-updated', ({ playerId, cardIndex, position }) => {
      setSharedPlayArea(prev => {
        const updated = [...prev];
        if (updated[cardIndex]) {
          updated[cardIndex] = {
            ...updated[cardIndex],
            position
          };
        }
        return updated;
      });
    });

    // Listen for card removal
    socket.on('card-removed', ({ playerId, cardIndex }) => {
      setSharedPlayArea(prev => prev.filter((_, i) => i !== cardIndex));
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
      socket.off('card-updated');
      socket.off('card-position-updated');
      socket.off('card-removed');
      socket.off('dice-rolled');
      socket.off('player-left');
    };
  }, [socket, roomId, playerName]); // Remove playerDeck from dependencies to prevent re-initialization

  const drawCards = (count) => {
    setDeck(prevDeck => {
      if (prevDeck.length === 0) return prevDeck;
      
      const cardsToDraw = prevDeck.slice(0, Math.min(count, prevDeck.length));
      const newDeck = prevDeck.slice(count);
      
      setHand(prevHand => [...prevHand, ...cardsToDraw]);
      return newDeck;
    });
  };

  const playCard = (card, index, position = null) => {
    // Remove from hand
    setHand(prev => prev.filter((_, i) => i !== index));
    
    // Add to shared play area
    const finalPosition = position || { 
      x: Math.random() * 500, 
      y: Math.random() * 300 
    };
    const newCard = { 
      ...card, 
      position: finalPosition,
      rotation: 0,
      tokens: 0,
      playerId: socket.id
    };
    
    setSharedPlayArea(prev => [...prev, newCard]);
    
    // Notify other players
    socket.emit('move-card', {
      roomId,
      card,
      from: 'hand',
      to: 'play-area',
      position: finalPosition,
      rotation: 0,
      tokens: 0
    });
  };

  const returnToHand = (card, index) => {
    setSharedPlayArea(prev => prev.filter((_, i) => i !== index));
    const { position, rotation, tokens, playerId, ...cleanCard } = card;
    setHand(prev => [...prev, cleanCard]);
    
    // Notify other players
    socket.emit('remove-card', {
      roomId,
      cardIndex: index
    });
  };

  const handleCardRotate = (index) => {
    setSharedPlayArea(prev => {
      const updated = [...prev];
      const newRotation = ((updated[index].rotation || 0) + 90) % 360;
      updated[index] = { ...updated[index], rotation: newRotation };
      
      // Notify other players
      socket.emit('update-card', {
        roomId,
        cardIndex: index,
        rotation: newRotation
      });
      
      return updated;
    });
  };

  const handleTokenChange = (index, newTokenCount) => {
    setSharedPlayArea(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], tokens: newTokenCount };
      
      // Notify other players
      socket.emit('update-card', {
        roomId,
        cardIndex: index,
        tokens: newTokenCount
      });
      
      return updated;
    });
  };

  const handleDragStart = (e, card, index, source = 'play-area') => {
    // Calculate offset from mouse to card position
    if (source === 'play-area') {
      const cardElement = e.currentTarget;
      const rect = cardElement.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const offsetY = e.clientY - rect.top;
      setDragOffset({ x: offsetX, y: offsetY });
    }
    
    setDraggedCard({ card, index, source });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', ''); // Required for Firefox
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (!draggedCard) return;

    const rect = e.currentTarget.getBoundingClientRect();
    let x, y;
    
    if (draggedCard.source === 'hand') {
      // When dropping from hand, center the card on cursor
      x = e.clientX - rect.left - 60; // 60 is half of small card width
      y = e.clientY - rect.top - 83.5; // 83.5 is half of small card height
    } else {
      // When moving within play area, use the drag offset for pixel-perfect positioning
      x = e.clientX - rect.left - dragOffset.x;
      y = e.clientY - rect.top - dragOffset.y;
    }
    
    // Very loose bounds - allow cards to move freely, even slightly outside
    const minX = -50;
    const minY = -50;
    const maxX = rect.width - 70;
    const maxY = rect.height - 117;
    
    x = Math.max(minX, Math.min(x, maxX));
    y = Math.max(minY, Math.min(y, maxY));

    if (draggedCard.source === 'hand') {
      // Card is being played from hand
      playCard(draggedCard.card, draggedCard.index, { x, y });
    } else {
      // Card is being moved within play area - use precise positioning
      setSharedPlayArea(prev => {
        const updated = [...prev];
        updated[draggedCard.index] = {
          ...updated[draggedCard.index],
          position: { x, y } // Keep full decimal precision
        };

        // Notify other players ONCE when dropped
        socket.emit('update-card-position', {
          roomId,
          cardIndex: draggedCard.index,
          position: { x, y }
        });

        return updated;
      });
    }

    setDraggedCard(null);
  };

  const rollDice = (sides = 6) => {
    socket.emit('roll-dice', { roomId, sides });
  };

  const shuffleDeck = () => {
    const allCards = [...hand, ...deck, ...sharedPlayArea.map(c => {
      const { position, rotation, tokens, playerId, ...cleanCard } = c;
      return cleanCard;
    })];
    const shuffled = allCards.sort(() => Math.random() - 0.5);
    
    setDeck(shuffled);
    setHand([]);
    setSharedPlayArea([]);
    
    setTimeout(() => drawCards(5), 100);
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
        <div 
          className="shared-play-area"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <h3>Play Area ({sharedPlayArea.length} cards)</h3>
          <div className="cards-container">
            {sharedPlayArea.map((card, index) => {
              const isDragging = draggedCard && draggedCard.index === index && draggedCard.source === 'play-area';
              
              return (
                <div
                  key={`play-${index}`}
                  className={`played-card ${isDragging ? 'dragging-card' : ''}`}
                  style={{
                    left: card.position.x + 'px',
                    top: card.position.y + 'px'
                  }}
                >
                  <Card 
                    card={card} 
                    size="small"
                    rotation={card.rotation || 0}
                    tokens={card.tokens || 0}
                    onRotate={() => handleCardRotate(index)}
                    onTokenChange={(tokens) => handleTokenChange(index, tokens)}
                    onDoubleClick={() => returnToHand(card, index)}
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, card, index, 'play-area')}
                  />
                </div>
              );
            })}
          </div>
          {sharedPlayArea.length === 0 && (
            <div className="empty-area">
              <p>Click or drag cards from your hand to play them here</p>
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
                draggable={true}
                onDragStart={(e) => handleDragStart(e, card, index, 'hand')}
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
