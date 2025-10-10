import React, { useEffect, useState, useRef } from 'react';
import { useSocket } from '../contexts/SocketContext';
import Card from './Card';
import './GameBoard.css';

const GameBoard = ({ roomId, playerName, playerDeck }) => {
  const { socket } = useSocket();
  const [players, setPlayers] = useState([]);
  const [hand, setHand] = useState([]);
  const [deck, setDeck] = useState([...playerDeck]);
  const [playArea, setPlayArea] = useState([]); // All cards on table (yours + opponent's)
  const [diceResult, setDiceResult] = useState(null);
  const [zoomedCard, setZoomedCard] = useState(null);
  const [draggedCard, setDraggedCard] = useState(null);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [hasMoved, setHasMoved] = useState(false);
  const playAreaRef = useRef(null);

  useEffect(() => {
    if (!socket) return;

    socket.emit('join-room', { roomId, playerName });
    socket.emit('set-deck', { roomId, deck: playerDeck });
    drawCards(5);

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

    socket.on('card-moved', ({ playerId, card, position, rotation, tokens }) => {
      setPlayArea(prev => {
        const existing = prev.findIndex(c => c.uniqueId === card.uniqueId);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = { 
            ...card, 
            position, 
            rotation: rotation || 0, 
            tokens: tokens || 0, 
            playerId,
            isOpponent: true 
          };
          return updated;
        }
        return [...prev, { 
          ...card, 
          position, 
          rotation: rotation || 0, 
          tokens: tokens || 0, 
          playerId,
          isOpponent: true 
        }];
      });
    });

    socket.on('card-removed', ({ cardId }) => {
      setPlayArea(prev => prev.filter(c => c.uniqueId !== cardId));
    });

    socket.on('dice-rolled', ({ playerId, result, sides }) => {
      setDiceResult({ playerId, result, sides });
      setTimeout(() => setDiceResult(null), 3000);
    });

    socket.on('player-left', ({ playerId }) => {
      setPlayers(prev => prev.filter(p => p.id !== playerId));
      setPlayArea(prev => prev.filter(c => c.playerId !== playerId));
    });

    return () => {
      socket.off('room-joined');
      socket.off('player-joined');
      socket.off('card-moved');
      socket.off('card-removed');
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
    const uniqueCard = { 
      ...card, 
      uniqueId: `${card.id}-${Date.now()}-${Math.random()}`,
      rotation: 0, 
      tokens: 0,
      isOpponent: false,
      playerId: socket?.id
    };
    
    setHand(prev => prev.filter((_, i) => i !== index));
    
    const rect = playAreaRef.current?.getBoundingClientRect();
    const position = { 
      x: Math.random() * ((rect?.width || 800) - 200), 
      y: Math.random() * ((rect?.height || 600) - 280)
    };
    
    setPlayArea(prev => [...prev, { ...uniqueCard, position }]);
    
    socket.emit('move-card', {
      roomId,
      card: uniqueCard,
      position,
      rotation: 0,
      tokens: 0
    });
  };

  const returnToHand = (card) => {
    if (card.isOpponent) return; // Can't take opponent's cards
    
    setPlayArea(prev => prev.filter(c => c.uniqueId !== card.uniqueId));
    const { uniqueId, position, rotation, tokens, isOpponent, playerId, ...originalCard } = card;
    setHand(prev => [...prev, originalCard]);
    socket.emit('card-removed', { roomId, cardId: card.uniqueId });
  };

  const updateCardOnServer = (card) => {
    socket.emit('move-card', {
      roomId,
      card: card,
      position: card.position,
      rotation: card.rotation,
      tokens: card.tokens
    });
  };

  const handleCardMouseDown = (e, card) => {
    if (card.isOpponent) return; // Can't drag opponent's cards
    if (e.button !== 0) return; // Only left mouse button
    
    e.preventDefault();
    const rect = playAreaRef.current.getBoundingClientRect();
    
    setDragStartPos({ x: e.clientX, y: e.clientY });
    setHasMoved(false);
    setDraggedCard({
      card,
      offsetX: e.clientX - rect.left - card.position.x,
      offsetY: e.clientY - rect.top - card.position.y
    });
  };

  const handleMouseMove = (e) => {
    if (!draggedCard) return;
    
    const moveDistance = Math.sqrt(
      Math.pow(e.clientX - dragStartPos.x, 2) + 
      Math.pow(e.clientY - dragStartPos.y, 2)
    );
    
    if (moveDistance > 5) {
      setHasMoved(true);
    }
    
    const rect = playAreaRef.current.getBoundingClientRect();
    const newX = Math.max(0, Math.min(e.clientX - rect.left - draggedCard.offsetX, rect.width - 180));
    const newY = Math.max(0, Math.min(e.clientY - rect.top - draggedCard.offsetY, rect.height - 250));
    
    setPlayArea(prev => prev.map(c => 
      c.uniqueId === draggedCard.card.uniqueId 
        ? { ...c, position: { x: newX, y: newY } }
        : c
    ));
  };

  const handleMouseUp = () => {
    if (draggedCard) {
      if (hasMoved) {
        // Update server with final position
        const updatedCard = playArea.find(c => c.uniqueId === draggedCard.card.uniqueId);
        if (updatedCard) {
          updateCardOnServer(updatedCard);
        }
      } else {
        // It was a click, not a drag - show zoom
        const card = playArea.find(c => c.uniqueId === draggedCard.card.uniqueId);
        if (card && !card.isOpponent) {
          setZoomedCard(card);
        }
      }
      setDraggedCard(null);
      setHasMoved(false);
    }
  };

  useEffect(() => {
    if (draggedCard) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggedCard, playArea, dragStartPos, hasMoved]);

  const rotateCard = (card) => {
    if (card.isOpponent) return;
    
    setPlayArea(prev => prev.map(c => {
      if (c.uniqueId === card.uniqueId) {
        const newRotation = (c.rotation + 90) % 360;
        const updated = { ...c, rotation: newRotation };
        updateCardOnServer(updated);
        return updated;
      }
      return c;
    }));
  };

  const updateTokens = (card, newTokenCount) => {
    if (card.isOpponent) return;
    
    const tokens = Math.max(0, newTokenCount);
    setPlayArea(prev => prev.map(c => {
      if (c.uniqueId === card.uniqueId) {
        const updated = { ...c, tokens };
        updateCardOnServer(updated);
        return updated;
      }
      return c;
    }));
  };

  const rollDice = (sides = 6) => {
    socket.emit('roll-dice', { roomId, sides });
  };

  const shuffleDeck = () => {
    const myCards = playArea.filter(c => !c.isOpponent);
    const shuffled = [
      ...hand, 
      ...deck, 
      ...myCards.map(c => {
        const { rotation, tokens, position, uniqueId, isOpponent, playerId, ...original } = c;
        return original;
      })
    ].sort(() => Math.random() - 0.5);
    
    setDeck(shuffled);
    setHand([]);
    
    // Remove only my cards from play area
    setPlayArea(prev => prev.filter(c => c.isOpponent));
    
    // Notify server
    myCards.forEach(card => {
      socket.emit('card-removed', { roomId, cardId: card.uniqueId });
    });
    
    drawCards(5);
  };

  // Separate hand by card type
  const illuminatiCards = hand.filter(c => c.type === 'illuminati');
  const groupResourceCards = hand.filter(c => c.type === 'groups' || c.type === 'resources');
  const plotCards = hand.filter(c => c.type === 'plots');

  return (
    <div className="game-board-container">
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

      {diceResult && (
        <div className="dice-popup">
          <div className="dice-result">🎲 {diceResult.result} 🎲</div>
        </div>
      )}

      {/* Single unified play area (tabletop) */}
      <div 
        className="play-area-unified" 
        ref={playAreaRef}
      >
        <h3 className="area-label">Tabletop ({playArea.length} cards)</h3>
        
        {playArea.map((card) => (
          <div
            key={card.uniqueId}
            className="played-card"
            style={{
              left: card.position.x,
              top: card.position.y,
              position: 'absolute',
              cursor: card.isOpponent ? 'default' : 'grab'
            }}
            onMouseDown={(e) => handleCardMouseDown(e, card)}
          >
            <Card 
              card={card} 
              size="small"
              rotation={card.rotation || 0}
              tokens={card.tokens || 0}
              showBack={card.isOpponent}
              isOpponent={card.isOpponent}
              onDoubleClick={() => returnToHand(card)}
              onRotate={() => rotateCard(card)}
              onTokenChange={(newTokens) => updateTokens(card, newTokens)}
            />
          </div>
        ))}
        
        {playArea.length === 0 && (
          <div className="empty-tabletop">
            <p>🎴 Click cards from your hand to play them on the tabletop</p>
            <p className="hint">Drag to move • Right-click to rotate • Hover for tokens • Double-click to return to hand</p>
          </div>
        )}
      </div>

      {/* Hand with three sections */}
      <div className="hand">
        <div className="hand-section">
          <h3>Illuminati ({illuminatiCards.length})</h3>
          <div className="hand-cards">
            {illuminatiCards.map((card, index) => (
              <div key={`illum-${index}`} className="hand-card">
                <Card 
                  card={card} 
                  size="small" 
                  onClick={() => {
                    const originalIndex = hand.findIndex(c => c === card);
                    playCard(card, originalIndex);
                  }} 
                />
              </div>
            ))}
            {illuminatiCards.length === 0 && <p className="empty-section">No Illuminati cards</p>}
          </div>
        </div>

        <div className="hand-section">
          <h3>Groups & Resources ({groupResourceCards.length})</h3>
          <div className="hand-cards">
            {groupResourceCards.map((card, index) => (
              <div key={`group-${index}`} className="hand-card">
                <Card 
                  card={card} 
                  size="small" 
                  onClick={() => {
                    const originalIndex = hand.findIndex(c => c === card);
                    playCard(card, originalIndex);
                  }} 
                />
              </div>
            ))}
            {groupResourceCards.length === 0 && <p className="empty-section">No Group/Resource cards</p>}
          </div>
        </div>

        <div className="hand-section">
          <h3>Plots ({plotCards.length})</h3>
          <div className="hand-cards">
            {plotCards.map((card, index) => (
              <div key={`plot-${index}`} className="hand-card">
                <Card 
                  card={card} 
                  size="small" 
                  onClick={() => {
                    const originalIndex = hand.findIndex(c => c === card);
                    playCard(card, originalIndex);
                  }} 
                />
              </div>
            ))}
            {plotCards.length === 0 && <p className="empty-section">No Plot cards</p>}
          </div>
        </div>
      </div>

      {/* Card zoom overlay */}
      {zoomedCard && !zoomedCard.isOpponent && (
        <div className="card-zoom-overlay" onClick={() => setZoomedCard(null)}>
          <div className="card-zoom-content" onClick={(e) => e.stopPropagation()}>
            <button className="zoom-close" onClick={() => setZoomedCard(null)}>✕</button>
            <Card card={zoomedCard} size="large" draggable={false} />
          </div>
        </div>
      )}
    </div>
  );
};

export default GameBoard;