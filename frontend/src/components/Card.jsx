import React, { useState } from 'react';
import './Card.css';

const Card = ({ 
  card, 
  onClick, 
  onDoubleClick, 
  draggable = true, 
  size = 'normal',
  rotation = 0,
  tokens = 0,
  onRotate,
  onTokenChange,
  onDragStart,
  onDrag,
  onDragEnd
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  // Get card image path
  const getCardImagePath = () => {
    return `${import.meta.env.BASE_URL}cards/${card.filename}`;
  };

  // Get card type color
  const getTypeColor = () => {
    const colors = {
      illuminati: '#ffd700',  // yellow
      groups: '#e24a4a',      // red
      plots: '#4a90e2',       // blue
      resources: '#8B4513'    // brown
    };
    return colors[card.type] || '#999';
  };

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };

  const handleRotate = (e) => {
    e.stopPropagation();
    if (onRotate) {
      onRotate();
    }
  };

  const handleAddToken = (e) => {
    e.stopPropagation();
    if (onTokenChange) {
      onTokenChange(tokens + 1);
    }
  };

  const handleRemoveToken = (e) => {
    e.stopPropagation();
    if (onTokenChange && tokens > 0) {
      onTokenChange(tokens - 1);
    }
  };

  // Check if this is an illuminati card (landscape)
  const isIlluminati = card.type === 'illuminati';
  const sizeClass = size === 'small' ? 'card-small' : size === 'large' ? 'card-large' : '';
  const landscapeClass = isIlluminati ? 'card-landscape' : '';

  return (
    <div
      className={`card ${sizeClass} ${landscapeClass}`}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      draggable={draggable}
      onDragStart={onDragStart}
      onDrag={onDrag}
      onDragEnd={onDragEnd}
      style={{ 
        borderColor: getTypeColor(),
        transform: `rotate(${rotation}deg)`
      }}
    >
      {imageLoading && (
        <div className="card-loading">
          <div className="spinner"></div>
        </div>
      )}
      
      {imageError ? (
        <div className="card-placeholder" style={{ borderColor: getTypeColor() }}>
          <h3>{card.name}</h3>
          <p className="card-id">{card.id}</p>
        </div>
      ) : (
        <img
          src={getCardImagePath()}
          alt={card.name}
          className="card-image"
          onLoad={handleImageLoad}
          onError={handleImageError}
          style={{ display: imageLoading ? 'none' : 'block' }}
        />
      )}

      {/* Token Counter */}
      {tokens > 0 && (
        <div className="token-counter">{tokens}</div>
      )}

      {/* Token Controls (on hover) */}
      {(onTokenChange || onRotate) && (
        <div className="token-controls">
          {onTokenChange && (
            <>
              <button 
                className="token-btn token-minus" 
                onClick={handleRemoveToken}
                disabled={tokens === 0}
              >
                −
              </button>
              <button 
                className="token-btn token-plus" 
                onClick={handleAddToken}
              >
                +
              </button>
            </>
          )}
        </div>
      )}

      {/* Rotation Control (on hover) */}
      {onRotate && (
        <div className="rotate-control">
          <button className="rotate-btn" onClick={handleRotate}>
            ↻
          </button>
        </div>
      )}
    </div>
  );
};

export default Card;
