import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useSocket } from '../contexts/SocketContext';
import Card from './Card';
import Dice3D from './Dice';
import './Dice.css';
import './GameBoard.css';

const GameBoard = ({ roomId, playerName, playerDeck }) => {
  const { socket } = useSocket();
  const [players, setPlayers] = useState([]);
  const [gamePhase, setGamePhase] = useState('setup');
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
  const [showTopCards, setShowTopCards] = useState(null);
  const [opponentHandCounts, setOpponentHandCounts] = useState({
    illuminati: 0,
    groups: 0,
    resources: 0,
    plots: 0
  });
  const [isFullscreenView, setIsFullscreenView] = useState(false);
  
  const cardsContainerRef = useRef(null);

  useEffect(() => {
    if (!socket || !playerDeck || playerDeck.length === 0) return;

    socket.emit('join-room', { roomId, playerName });

    const illuminati = playerDeck.filter(c => c.type === 'illuminati');
    const groups = playerDeck.filter(c => c.type === 'groups');
    const resources = playerDeck.filter(c => c.type === 'resources');
    const plots = playerDeck.filter(c => c.type === 'plots');

    const shuffledPlots = [...plots].sort(() => Math.random() - 0.5);
    const initialHand = [...illuminati, ...groups, ...shuffledPlots.slice(0, 3)];
    
    setHand(initialHand);
    setPlotPile(shuffledPlots.slice(3));
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
        setSharedPlayArea(prev => [...prev, { ...card, position, playerId, rotation: rotation || 0, tokens: tokens || 0 }]);
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
          updated[cardIndex] = { ...updated[cardIndex], position };
        }
        return updated;
      });
    });

    socket.on('card-removed', ({ playerId, cardIndex }) => {
      setSharedPlayArea(prev => prev.filter((_, i) => i !== cardIndex));
    });

    socket.on('dice-rolled', ({ dice1, dice2 }) => {
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

    socket.on('show-card-to-all', ({ card }) => {
      setPreviewCard(card);
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
      socket.off('show-card-to-all');
    };
  }, [socket, roomId, playerName, playerDeck]);

  const groupedHand = useMemo(() => {
    const groups = { illuminati: [], groups: [], resources: [], plots: [] };
    hand.forEach((card, index) => {
      groups[card.type].push({ card, originalIndex: index });
    });
    return groups;
  }, [hand]);

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

  const handleSetupDone = () => {
    const myPlayedCards = sharedPlayArea.filter(c => c.playerId === socket.id);
    const hasIlluminati = myPlayedCards.some(c => c.type === 'illuminati');
    const hasGroup = myPlayedCards.some(c => c.type === 'groups');
    
    if (!hasIlluminati || !hasGroup) {
      alert('Please place 1 Illuminati card and 1 Group card on the play area before clicking Done.');
      return;
    }

    const playedCardIds = myPlayedCards.map(c => c.id);
    const remainingHand = hand.filter(c => !playedCardIds.includes(c.id));
    const remainingGroups = remainingHand.filter(c => c.type === 'groups');
    const resources = playerDeck.filter(c => c.type === 'resources');
    const groupResourceDeck = [...remainingGroups, ...resources].sort(() => Math.random() - 0.5);
    const drawn = groupResourceDeck.slice(0, 6);
    const remainingGroupResource = groupResourceDeck.slice(6);
    const plots = remainingHand.filter(c => c.type === 'plots');
    setHand([...plots, ...drawn]);
    setGroupResourcePile(remainingGroupResource);
    setGamePhase('playing');
    setSetupReady(true);
  };

  const drawFromGroupResource = () => {
    if (groupResourcePile.length === 0) return;
    setHand(prev => [...prev, groupResourcePile[0]]);
    setGroupResourcePile(prev => prev.slice(1));
  };

  const showTopGroupResource = () => {
    if (groupResourcePile.length === 0) return;
    const topCard = groupResourcePile[0];
    setPreviewCard(topCard);
    socket.emit('show-card-to-all', { roomId, card: topCard });
  };

  const drawFromPlots = () => {
    if (plotPile.length === 0) return;
    setHand(prev => [...prev, plotPile[0]]);
    setPlotPile(prev => prev.slice(1));
  };

  const drawFromPlotsBottom = () => {
    if (plotPile.length === 0) return;
    setHand(prev => [...prev, plotPile[plotPile.length - 1]]);
    setPlotPile(prev => prev.slice(0, -1));
  };

  const showTopPlot = () => {
    if (plotPile.length === 0) return;
    setShowTopCards([plotPile[0]]);
  };

  const showTopThreePlots = () => {
    if (plotPile.length === 0) return;
    setShowTopCards(plotPile.slice(0, Math.min(3, plotPile.length)));
  };

  const playCard = (card, originalIndex, position = null) => {
    setHand(prev => prev.filter((_, i) => i !== originalIndex));
    const finalPosition = position || { x: Math.random() * 500, y: Math.random() * 300 };
    const newCard = { ...card, position: finalPosition, rotation: 0, tokens: 0, playerId: socket.id };
    setSharedPlayArea(prev => [...prev, newCard]);
    socket.emit('move-card', { roomId, card, from: 'hand', to: 'play-area', position: finalPosition, rotation: 0, tokens: 0 });
  };

  const returnToHand = (card, index) => {
    setSharedPlayArea(prev => prev.filter((_, i) => i !== index));
    const { position, rotation, tokens, playerId, ...cleanCard } = card;
    setHand(prev => [...prev, cleanCard]);
    socket.emit('remove-card', { roomId, cardIndex: index });
  };

  const handleCardRotate = (index) => {
    setSharedPlayArea(prev => {
      const updated = [...prev];
      const newRotation = ((updated[index].rotation || 0) + 90) % 360;
      updated[index] = { ...updated[index], rotation: newRotation };
      socket.emit('update-card', { roomId, cardIndex: index, rotation: newRotation });
      return updated;
    });
  };

  const handleTokenChange = (index, newTokenCount) => {
    setSharedPlayArea(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], tokens: newTokenCount };
      socket.emit('update-card', { roomId, cardIndex: index, tokens: newTokenCount });
      return updated;
    });
  };

   const handleDragStart = (e, card, originalIndex, source = 'play-area') => {
    if (source === 'play-area') {
      // For cards in play area, calculate offset relative to stored position
      // This works correctly even for rotated cards
      const containerRect = cardsContainerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - containerRect.left;
      const mouseY = e.clientY - containerRect.top;
      setDragOffset({ 
        x: mouseX - card.position.x, 
        y: mouseY - card.position.y 
      });
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
    
    x = Math.max(-50, Math.min(x, containerRect.width - 70));
    y = Math.max(-50, Math.min(y, containerRect.height - 117));

    if (draggedCard.source === 'hand') {
      playCard(draggedCard.card, draggedCard.index, { x, y });
    } else {
      setSharedPlayArea(prev => {
        const updated = [...prev];
        updated[draggedCard.index] = { ...updated[draggedCard.index], position: { x, y } };
        socket.emit('update-card-position', { roomId, cardIndex: draggedCard.index, position: { x, y } });
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
    <div className={`game-board-container ${isFullscreenView ? 'fullscreen-mode' : ''}`}>
      {/* Header - Hidden in fullscreen */}
      {!isFullscreenView && (
        <div className="game-header">
        <div className="room-info">
          <h2>{roomId}</h2>
          <div className="players">
            {players.map(player => (
              <span key={player.id} className="player-badge">
                {player.name}{player.id === socket?.id ? ' (You)' : ''}
              </span>
            ))}
          </div>
          {gamePhase === 'playing' && (
            <>
              <button className="dice-button" onClick={roll2D6}>🎲 2D6</button>
              <button className="view-board-button" onClick={() => setIsFullscreenView(true)}>
                👁️ View Board
              </button>
            </>
          )}
          {gamePhase === 'setup' && (
            <button className="setup-done-button" onClick={handleSetupDone}>✓ Done</button>
          )}
        </div>

        <div className="room-info">
          {(opponentHandCounts.illuminati + opponentHandCounts.groups + opponentHandCounts.resources + opponentHandCounts.plots) > 0 && (
            <div className="opponent-hand-info">
              <span style={{ fontWeight: 'bold' }}>Opp:</span>
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
      </div>
      )}

      {/* Setup Instructions - Hidden in fullscreen */}
      {!isFullscreenView && gamePhase === 'setup' && (
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

      {previewCard && (
        <div className="card-preview-overlay" onClick={closePreview}>
          <div className="card-preview-content" onClick={(e) => e.stopPropagation()}>
            <div className="preview-header">
              <h3>{previewCard.name}</h3>
              <button className="preview-close" onClick={closePreview}>✕</button>
            </div>
            <Card card={previewCard} size="large" draggable={false} />
          </div>
        </div>
      )}

      {showTopCards && (
        <div className="card-preview-overlay" onClick={() => setShowTopCards(null)}>
          <div className="card-preview-content show-multiple" onClick={(e) => e.stopPropagation()}>
            <div className="preview-header">
              <h3>Top {showTopCards.length} Card{showTopCards.length > 1 ? 's' : ''} (Private View)</h3>
              <button className="preview-close" onClick={() => setShowTopCards(null)}>✕</button>
            </div>
            <div className="multiple-cards-display">
              {showTopCards.map((card, index) => (
                <div key={`top-${index}`} className="preview-card-item">
                  <Card card={card} size="large" draggable={false} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="play-area">
        <div className={`shared-play-area ${isDragOver ? 'drag-over' : ''}`} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
          <div className="cards-container" ref={cardsContainerRef}>
            {sharedPlayArea.map((card, index) => {
              const isDragging = draggedCard && draggedCard.index === index && draggedCard.source === 'play-area';
              return (
                <div key={`play-${index}`} className={`played-card ${isDragging ? 'dragging-card' : ''}`} style={{ left: card.position.x + 'px', top: card.position.y + 'px' }} onContextMenu={(e) => handleRightClick(e, card)}>
                  <Card card={card} size="small" rotation={card.rotation || 0} tokens={card.tokens || 0} onRotate={() => handleCardRotate(index)} onTokenChange={(tokens) => handleTokenChange(index, tokens)} onDoubleClick={() => returnToHand(card, index)} draggable={true} onDragStart={(e) => handleDragStart(e, card, index, 'play-area')} onDragEnd={handleDragEnd} />
                </div>
              );
            })}
          </div>
          {sharedPlayArea.length === 0 && (
            <div className="empty-area">
              <div className="empty-area-icon">🎯</div>
              <p>{gamePhase === 'setup' ? 'Place your Illuminati and 1 Group card here' : 'Click or drag cards from your hand to play them here'}</p>
            </div>
          )}
        </div>
      </div>

      {/* Exit Fullscreen Button */}
      {isFullscreenView && (
        <button className="exit-fullscreen-button" onClick={() => setIsFullscreenView(false)}>
          ✕ Exit View
        </button>
      )}

      {/* Hand with Draw Piles - Hidden in fullscreen */}
      {!isFullscreenView && (
        <div className="hand">
        {gamePhase === 'playing' && (
          <div className="draw-piles">
            <div className="pile-section">
              <div className="draw-pile">
                <div className="card-back">
                  <img src="/cards/group-back.webp" alt="Groups/Resources" className="card-back-image" />
                  <div className="pile-count">{groupResourcePile.length}</div>
                </div>
              </div>
              <div className="pile-actions">
                <button className="pile-action-btn" onClick={drawFromGroupResource} disabled={groupResourcePile.length === 0}>Draw</button>
                <button className="pile-action-btn" onClick={showTopGroupResource} disabled={groupResourcePile.length === 0}>Show</button>
              </div>
            </div>

            <div className="pile-section">
              <div className="draw-pile">
                <div className="card-back">
                  <img src="/cards/plot-back.webp" alt="Plots" className="card-back-image" />
                  <div className="pile-count">{plotPile.length}</div>
                </div>
              </div>
              <div className="pile-actions">
                <button className="pile-action-btn" onClick={drawFromPlots} disabled={plotPile.length === 0}>Top</button>
                <button className="pile-action-btn" onClick={drawFromPlotsBottom} disabled={plotPile.length === 0}>Bottom</button>
                <button className="pile-action-btn" onClick={showTopPlot} disabled={plotPile.length === 0}>Show 1</button>
                <button className="pile-action-btn" onClick={showTopThreePlots} disabled={plotPile.length === 0}>Show 3</button>
              </div>
            </div>
          </div>
        )}

        <div className="hand-section">
          <div className="hand-cards">
            {groupedHand.illuminati.length > 0 && (
              <div className="hand-card-group">
                {groupedHand.illuminati.map(({ card, originalIndex }) => (
                  <div key={`hand-illuminati-${originalIndex}`} className="hand-card" onContextMenu={(e) => handleRightClick(e, card)}>
                    <Card card={card} size="small" onClick={() => playCard(card, originalIndex)} draggable={true} onDragStart={(e) => handleDragStart(e, card, originalIndex, 'hand')} onDragEnd={handleDragEnd} />
                  </div>
                ))}
              </div>
            )}
            
            {groupedHand.groups.length > 0 && (
              <div className="hand-card-group">
                {groupedHand.groups.map(({ card, originalIndex }) => (
                  <div key={`hand-groups-${originalIndex}`} className="hand-card" onContextMenu={(e) => handleRightClick(e, card)}>
                    <Card card={card} size="small" onClick={() => playCard(card, originalIndex)} draggable={true} onDragStart={(e) => handleDragStart(e, card, originalIndex, 'hand')} onDragEnd={handleDragEnd} />
                  </div>
                ))}
              </div>
            )}
            
            {groupedHand.resources.length > 0 && (
              <div className="hand-card-group">
                {groupedHand.resources.map(({ card, originalIndex }) => (
                  <div key={`hand-resources-${originalIndex}`} className="hand-card" onContextMenu={(e) => handleRightClick(e, card)}>
                    <Card card={card} size="small" onClick={() => playCard(card, originalIndex)} draggable={true} onDragStart={(e) => handleDragStart(e, card, originalIndex, 'hand')} onDragEnd={handleDragEnd} />
                  </div>
                ))}
              </div>
            )}
            
            {groupedHand.plots.length > 0 && (
              <div className="hand-card-group">
                {groupedHand.plots.map(({ card, originalIndex }) => (
                  <div key={`hand-plots-${originalIndex}`} className="hand-card" onContextMenu={(e) => handleRightClick(e, card)}>
                    <Card card={card} size="small" onClick={() => playCard(card, originalIndex)} draggable={true} onDragStart={(e) => handleDragStart(e, card, originalIndex, 'hand')} onDragEnd={handleDragEnd} />
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
      )}
    </div>
  );
};

export default GameBoard;
