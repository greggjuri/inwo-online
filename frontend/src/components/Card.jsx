import React, { useState } from 'react';
import './Card.css';

const Card = ({ 
  card, 
  onClick, 
  onDoubleClick, 
  size = 'normal',
  rotation = 0,
  tokens = 0,
  showBack = false,
  isOpponent = false,
  onRotate,
  onTokenChange,
  draggable = true
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);

  // Get card image path
  const getCardImagePath = () => {
    return `/cards/${card.filename}`;
  };

  // Card back path (you'll add this image later)
  const getCardBackPath = () => {
    return `/cards/card-back.webp`;
  };

  // Get card type color
  const getTypeColor = () => {
    const colors = {
      illuminati: '#ffd700',
      groups: '#4a90e2',
      plots: '#e24a4a',
      resources: '#50c878'
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

  const handleContextMenu = (e) => {
    e.preventDefault();
    if (onRotate && !isOpponent) {
      onRotate();
    }
  };

  const handleClick = (e) => {
    // Don't trigger click if this is handled by parent (drag/drop scenario)
    if (onClick && !isDragging) {
      onClick(e);
    }
  };

  const handleDoubleClick = (e) => {
    if (onDoubleClick && !isOpponent) {
      onDoubleClick(e);
    }
  };

  const sizeClass = size === 'small' ? 'card-small' : size === 'large' ? 'card-large' : '';

  return (
    <div
      className={`card ${sizeClass} ${isDragging ? 'dragging' : ''}`}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={handleContextMenu}
      style={{ 
        borderColor: getTypeColor(),
        transform: `rotate(${rotation}deg)`,
        cursor: draggable ? 'grab' : 'pointer'
      }}
    >
      {imageLoading && !showBack && (
        <div className="card-loading">
          <div className="spinner"></div>
        </div>
      )}
      
      {showBack ? (
        // Show card back for opponent
        <div className="card-back" style={{ borderColor: getTypeColor() }}>
          <div className="card-back-pattern">🎴</div>
        </div>
      ) : imageError ? (
        <div className="card-placeholder" style={{ borderColor: getTypeColor() }}>
          <div className="card-type-badge" style={{ background: getTypeColor() }}>
            {card.type}
          </div>
          <h3>{card.name}</h3>
          <p className="card-id">{card.id}</p>
        </div>
      ) : (
        <>
          <img
            src={getCardImagePath()}
            alt={card.name}
            className="card-image"
            onLoad={handleImageLoad}
            onError={handleImageError}
            style={{ display: imageLoading ? 'none' : 'block' }}
          />
          <div className="card-type-badge" style={{ background: getTypeColor() }}>
            {card.type}
          </div>
        </>
      )}

      {/* Rotation indicator */}
      {rotation !== 0 && !showBack && size !== 'large' && (
        <div className="rotation-indicator">
          {rotation}°
        </div>
      )}

      {/* Token counter */}
      {tokens > 0 && !showBack && (
        <div className="token-counter">
          {tokens}
        </div>
      )}

      {/* Token controls (only show on hover for played cards) */}
      {onTokenChange && !isOpponent && !showBack && size !== 'large' && (
        <div className="token-controls">
          <button 
            className="token-btn token-minus"
            onClick={(e) => {
              e.stopPropagation();
              onTokenChange(tokens - 1);
            }}
            disabled={tokens <= 0}
          >
            −
          </button>
          <button 
            className="token-btn token-plus"
            onClick={(e) => {
              e.stopPropagation();
              onTokenChange(tokens + 1);
            }}
          >
            +
          </button>
        </div>
      )}

      {/* Rotate button (only show on hover) */}
      {onRotate && !isOpponent && !showBack && size !== 'large' && (
        <div className="rotate-control">
          <button 
            className="rotate-btn"
            onClick={(e) => {
              e.stopPropagation();
              onRotate();
            }}
            title="Right-click or click to rotate"
          >
            ↻
          </button>
        </div>
      )}
    </div>
  );
};

export default Card;