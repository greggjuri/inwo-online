import React from 'react';
import './Dice.css';

const Dice3D = ({ value }) => {
  // Render dots based on value
  const renderDots = () => {
    const dots = [];
    for (let i = 0; i < value; i++) {
      dots.push(<span key={i} className="dot"></span>);
    }
    return dots;
  };

  return (
    <div className={`dice-display dice-value-${value}`}>
      {renderDots()}
    </div>
  );
};

export default Dice3D;