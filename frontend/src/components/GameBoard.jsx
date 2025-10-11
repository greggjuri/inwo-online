import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useSocket } from '../contexts/SocketContext';
import Card from './Card';
import Dice3D from './Dice';
import './Dice.css'; // IMPORTANT: Import Dice CSS first
import './GameBoard.css';
import './Dice.css'; // Import the dice CSS

const GameBoard = ({ roomId, playerName, playerDeck }) => {
  const { socket } = useSocket();
  const [players, setPlayers] = useState([]);
  const [gamePhase, setGamePhase] = useState('setup'); // 'setup', 'playing'
  const [hand, setHand] = useState([]);
  const [groupResourcePile, setGroupResourcePile] = useState([]);
  const [plotPile, setPlotPile] = useState([]);
  const [sharedPlayArea, setSharedPlayArea] = useState([]);
  const [diceResults, setDiceResults] = useState(null);
  const [draggedCard, setDraggedCard] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewCard, setPreviewCard] = useState(null);
  const [setupReady, setSetupReady] = useState(false);
  const [opponentHandCounts, setOpponentHandCounts] = useState({
    illuminati: 0,
    groups: 0,
    resources: 0,
    plots: 0
  });
  
  const cardsContainerRef = useRef(null);

  // Initial setup when joining game
  useEffect(() => {
    if (!socket || !playerDeck || playerDeck.length === 0) return;

    socket.emit('join-room', { roomId, playerName });

    // Separate cards by type
    const illuminati = playerDeck.filter(c => c.type === 'illuminati');
    const groups = playerDeck.filter(c => c.type === 'groups');
    const resources = playerDeck.filter(c => c.type === 'resources');
    const plots = playerDeck.filter(c => c.type === 'plots');

    // Initial hand: Illuminati + all Groups + 3 shuffled Plots
    const shuffledPlots = [...plots].sort(() => Math.random() - 0.5);
    const initialHand = [
      ...illuminati,
      ...groups,
      ...shuffledPlots.slice(0, 3)
    ];
    
    setHand(initialHand);
    setPlotPile(shuffledPlots.slice(3)); // Remaining plots in pile
    
    // Store groups and resources for later (after setup)
    setGroupResourcePile([...groups, ...resources]);

    socket.on('room-joined', ({ players: roomPlayers }) => {
      setPlayers(roomPlayers);
    });

    socket.on('player-joined', ({ playerId, playerName: newPlayerName }) => {
      setPlayers(prev => {
        const exists = prev.find(p => p.id === playerId);
        if (exists) return prev;
        return [...prev, { id: playerId, name: newPlayerName }];
      });
    });

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

    socket.on('card-removed', ({ playerId, cardIndex }) => {
      setSharedPlayArea(prev => prev.filter((_, i) => i !== cardIndex));
    });

    socket.on('dice-rolled', ({ dice1, dice2 }) => {
      console.log('Dice rolled:', dice1, dice2); // Debug log
      setDiceResults([dice1, dice2]);
    });

    socket.on('dice-closed', () => {
      setDiceResults(null);
    });

    socket.on('player-left', ({ playerId }) => {
      setPlayers(prev => prev.filter(p => p.id !== playerId));
    });

    socket.on('opponent-hand-update', ({ playerId, handCounts }) => {
      if (playerId !== socket.id) {
        setOpponentHandCounts(handCounts);
      }
    });

    return () => {
      socket.off('room-joined');
      socket.off('player-joined');
      socket.off('card-moved');
      socket.off('card-updated');
      socket.off('card-position-updated');
      socket.off('card-removed');
      socket.off('dice-rolled');
      socket.off('dice-closed');
      socket.off('player-left');
      socket.off('opponent-hand-update');
    };
  }, [socket, roomId, playerName, playerDeck]);

  // Group and sort hand cards by type
  const groupedHand = useMemo(() => {
    const groups = {
      illuminati: [],
      groups: [],
      resources: [],
      plots: []
    };
    
    hand.forEach((card, index) => {
      groups[card.type].push({ card, originalIndex: index });
    });
    
    return groups;
  }, [hand]);

  // Send hand counts to other players
  useEffect(() => {
    if (!socket) return;
    
    const counts = {
      illuminati: groupedHand.illuminati.length,
      groups: groupedHand.groups.length,
      resources: groupedHand.resources.length,
      plots: groupedHand.plots.length
    };
    
    socket.emit('hand-update', { roomId, handCounts: counts });
  }, [hand, socket, roomId, groupedHand]);

  // Handle "Done" button - finish setup phase
  const handleSetupDone = () => {
    // Check if 1 Illuminati and 1 Group have been placed
    const myPlayedCards = sharedPlayArea.filter(c => c.playerId === socket.id);
    const hasIlluminati = myPlayedCards.some(c => c.type === 'illuminati');
    const hasGroup = myPlayedCards.some(c => c.type === 'groups');
    
    if (!hasIlluminati || !hasGroup) {
      alert('Please place 1 Illuminati card and 1 Group card on the play area before clicking Done.');
      return;
    }

    // Remove played Illuminati and Group from hand
    const playedCardIds = myPlayedCards.map(c => c.id);
    const remainingHand = hand.filter(c => !playedCardIds.includes(c.id));
    
    // Get remaining groups from hand
    const remainingGroups = remainingHand.filter(c => c.type === 'groups');
    
    // Shuffle remaining groups with all resources
    const resources = playerDeck.filter(c => c.type === 'resources');
    const groupResourceDeck = [...remainingGroups, ...resources].sort(() => Math.random() - 0.5);
    
    // Draw 6 cards from group/resource deck
    const drawn = groupResourceDeck.slice(0, 6);
    const remainingGroupResource = groupResourceDeck.slice(6);
    
    // Update hand: plots + 6 new group/resource cards
    const plots = remainingHand.filter(c => c.type === 'plots');
    setHand([...plots, ...drawn]);
    
    // Set draw piles
    setGroupResourcePile(remainingGroupResource);
    
    setGamePhase('playing');
    setSetupReady(true);
  };

  const drawFromGroupResource = () => {
    if (groupResourcePile.length === 0) return;
    
    const drawn = groupResourcePile[0];
    setHand(prev => [...prev, drawn]);
    setGroupResourcePile(prev => prev.slice(1));
  };

  const drawFromPlots = () => {
    if (plotPile.length === 0) return;
    
    const drawn = plotPile[0];
    setHand(prev => [...prev, drawn]);
    setPlotPile(prev => prev.slice(1));
  };

  const playCard = (card, originalIndex, position = null) => {
    setHand(prev => prev.filter((_, i) => i !== originalIndex));
    
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
      
      socket.emit('update-card', {
        roomId,
        cardIndex: index,
        tokens: newTokenCount
      });
      
      return updated;
    });
  };

  const handleDragStart = (e, card, originalIndex, source = 'play-area') => {
    if (source === 'play-area') {
      const cardElement = e.currentTarget;
      const rect = cardElement.getBoundingClientRect();
      const containerRect = cardsContainerRef.current.getBoundingClientRect();
      
      const offsetX = e.clientX - rect.left;
      const offsetY = e.clientY - rect.top;
      
      setDragOffset({ x: offsetX, y: offsetY });
    }
    
    setDraggedCard({ card, index: originalIndex, source });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', '');
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    if (e.currentTarget === e.target) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    
    if (!draggedCard || !cardsContainerRef.current) return;

    const containerRect = cardsContainerRef.current.getBoundingClientRect();
    let x, y;
    
    if (draggedCard.source === 'hand') {
      x = e.clientX - containerRect.left - 60;
      y = e.clientY - containerRect.top - 83.5;
    } else {
      x = e.clientX - containerRect.left - dragOffset.x;
      y = e.clientY - containerRect.top - dragOffset.y;
    }
    
    const minX = -50;
    const minY = -50;
    const maxX = containerRect.width - 70;
    const maxY = containerRect.height - 117;
    
    x = Math.max(minX, Math.min(x, maxX));
    y = Math.max(minY, Math.min(y, maxY));

    if (draggedCard.source === 'hand') {
      playCard(draggedCard.card, draggedCard.index, { x, y });
    } else {
      setSharedPlayArea(prev => {
        const updated = [...prev];
        updated[draggedCard.index] = {
          ...updated[draggedCard.index],
          position: { x, y }
        };

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

  const handleDragEnd = () => {
    setDraggedCard(null);
    setIsDragOver(false);
  };

  const roll2D6 = () => {
    socket.emit('roll-dice', { roomId, sides: 6 });
  };

  const closeDice = () => {
    socket.emit('close-dice', { roomId });
    setDiceResults(null);
  };

  const handleRightClick = (e, card) => {
    e.preventDefault();
    setPreviewCard(card);
  };

  const closePreview = () => {
    setPreviewCard(null);
  };

  return (
    <div className="game-board-container">
      {/* Header */}
      <div className="game-header">
        <div className="room-info">
          <h2>🎮 Room: {roomId}</h2>
          <div className="players">
            {players.map(player => (
              <span key={player.id} className="player-badge">
                {player.name} {player.id === socket?.id ? '(You)' : ''}
              </span>
            ))}
          </div>
          {gamePhase === 'playing' && (
            <button className="dice-button" onClick={roll2D6}>
              🎲 Roll 2D6
            </button>
          )}
          {gamePhase === 'setup' && (
            <button className="setup-done-button" onClick={handleSetupDone}>
              ✓ Done
            </button>
          )}
        </div>

        {/* Draw Piles */}
        {gamePhase === 'playing' && (
          <div className="draw-piles">
            <div className="draw-pile" onClick={drawFromGroupResource}>
              <div className="card-back groups-resources">
                <div className="pile-count">{groupResourcePile.length}</div>
                <div className="pile-label">Groups/Resources</div>
              </div>
            </div>
            <div className="draw-pile" onClick={drawFromPlots}>
              <div className="card-back plots">
                <div className="pile-count">{plotPile.length}</div>
                <div className="pile-label">Plots</div>
              </div>
            </div>
          </div>
        )}

        {/* Opponent Hand Info */}
        {(opponentHandCounts.illuminati + opponentHandCounts.groups + 
          opponentHandCounts.resources + opponentHandCounts.plots) > 0 && (
          <div className="opponent-hand-info">
            <span style={{ fontWeight: 'bold', marginRight: '0.5rem' }}>Opponent's Hand:</span>
            {opponentHandCounts.illuminati > 0 && (
              <div className="hand-type-count">
                <span className="icon">👁️</span>
                <span className="count">{opponentHandCounts.illuminati}</span>
              </div>
            )}
            {opponentHandCounts.groups > 0 && (
              <div className="hand-type-count">
                <span className="icon">👥</span>
                <span className="count">{opponentHandCounts.groups}</span>
              </div>
            )}
            {opponentHandCounts.resources > 0 && (
              <div className="hand-type-count">
                <span className="icon">💎</span>
                <span className="count">{opponentHandCounts.resources}</span>
              </div>
            )}
            {opponentHandCounts.plots > 0 && (
              <div className="hand-type-count">
                <span className="icon">📋</span>
                <span className="count">{opponentHandCounts.plots}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Setup Instructions */}
      {gamePhase === 'setup' && (
        <div className="setup-instructions">
          <p>📋 Place 1 Illuminati card and 1 Group card on the play area, then click "Done"</p>
        </div>
      )}

      {/* Dice Results */}
      {diceResults && (
        <div className="dice-popup-overlay" onClick={closeDice}>
          <div className="dice-container">
            <Dice3D value={diceResults[0]} />
            <Dice3D value={diceResults[1]} />
          </div>
          <div className="dice-popup-hint">Click anywhere to close</div>
        </div>
      )}

      {/* Card Preview */}
      {previewCard && (
        <div className="card-preview-overlay" onClick={closePreview}>
          <div className="card-preview-content" onClick={(e) => e.stopPropagation()}>
            <div className="preview-header">
              <h3>{previewCard.name}</h3>
              <button className="preview-close" onClick={closePreview}>✕</button>
            </div>
            <Card
              card={previewCard}
              size="large"
              draggable={false}
            />
          </div>
        </div>
      )}

      {/* Play Area */}
      <div className="play-area">
        <div 
          className={`shared-play-area ${isDragOver ? 'drag-over' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="cards-container" ref={cardsContainerRef}>
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
                  onContextMenu={(e) => handleRightClick(e, card)}
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
                    onDragEnd={handleDragEnd}
                  />
                </div>
              );
            })}
          </div>
          {sharedPlayArea.length === 0 && (
            <div className="empty-area">
              <div className="empty-area-icon">🎯</div>
              <p>
                {gamePhase === 'setup' 
                  ? 'Place your Illuminati and 1 Group card here' 
                  : 'Click or drag cards from your hand to play them here'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Hand */}
      <div className="hand">
        <h3>🃏 Your Hand ({hand.length} cards)</h3>
        <div className="hand-cards">
          {/* Illuminati */}
          {groupedHand.illuminati.length > 0 && (
            <div className="hand-card-group">
              {groupedHand.illuminati.map(({ card, originalIndex }) => (
                <div 
                  key={`hand-illuminati-${originalIndex}`} 
                  className="hand-card"
                  onContextMenu={(e) => handleRightClick(e, card)}
                >
                  <Card
                    card={card}
                    size="small"
                    onClick={() => playCard(card, originalIndex)}
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, card, originalIndex, 'hand')}
                    onDragEnd={handleDragEnd}
                  />
                </div>
              ))}
            </div>
          )}
          
          {/* Groups */}
          {groupedHand.groups.length > 0 && (
            <div className="hand-card-group">
              {groupedHand.groups.map(({ card, originalIndex }) => (
                <div 
                  key={`hand-groups-${originalIndex}`} 
                  className="hand-card"
                  onContextMenu={(e) => handleRightClick(e, card)}
                >
                  <Card
                    card={card}
                    size="small"
                    onClick={() => playCard(card, originalIndex)}
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, card, originalIndex, 'hand')}
                    onDragEnd={handleDragEnd}
                  />
                </div>
              ))}
            </div>
          )}
          
          {/* Resources */}
          {groupedHand.resources.length > 0 && (
            <div className="hand-card-group">
              {groupedHand.resources.map(({ card, originalIndex }) => (
                <div 
                  key={`hand-resources-${originalIndex}`} 
                  className="hand-card"
                  onContextMenu={(e) => handleRightClick(e, card)}
                >
                  <Card
                    card={card}
                    size="small"
                    onClick={() => playCard(card, originalIndex)}
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, card, originalIndex, 'hand')}
                    onDragEnd={handleDragEnd}
                  />
                </div>
              ))}
            </div>
          )}
          
          {/* Plots */}
          {groupedHand.plots.length > 0 && (
            <div className="hand-card-group">
              {groupedHand.plots.map(({ card, originalIndex }) => (
                <div 
                  key={`hand-plots-${originalIndex}`} 
                  className="hand-card"
                  onContextMenu={(e) => handleRightClick(e, card)}
                >
                  <Card
                    card={card}
                    size="small"
                    onClick={() => playCard(card, originalIndex)}
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, card, originalIndex, 'hand')}
                    onDragEnd={handleDragEnd}
                  />
                </div>
              ))}
            </div>
          )}
          
          {hand.length === 0 && (
            <div className="empty-hand">
              <div className="empty-hand-icon">🎴</div>
              <p>Your hand is empty</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameBoard;