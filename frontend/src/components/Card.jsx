import React, { useState } from 'react';
import './Card.css';

const Card = ({ card, onClick, onDoubleClick, draggable = true, size = 'normal' }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  // Get card image path
  const getCardImagePath = () => {
    return `/cards/${card.filename}`;
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

  const sizeClass = size === 'small' ? 'card-small' : size === 'large' ? 'card-large' : '';

  return (
    <div
      className={`card ${sizeClass}`}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      draggable={draggable}
      style={{ borderColor: getTypeColor() }}
    >
      {imageLoading && (
        <div className="card-loading">
          <div className="spinner"></div>
        </div>
      )}
      
      {imageError ? (
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
    </div>
  );
};

export default Card;