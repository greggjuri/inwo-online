// frontend/src/components/Dice.jsx
import React from 'react';

const DiceFace = ({ value }) => {
  const renderDots = () => {
    switch(value) {
      case 1:
        return <div className="dot"></div>;
      
      case 2:
        return (
          <>
            <div className="dot"></div>
            <div className="dot"></div>
          </>
        );
      
      case 3:
        return (
          <>
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
          </>
        );
      
      case 4:
        return (
          <>
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
          </>
        );
      
      case 5:
        return (
          <>
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
          </>
        );
      
      case 6:
        return (
          <>
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
          </>
        );
      
      default:
        return null;
    }
  };

  return <>{renderDots()}</>;
};

const Dice3D = ({ value }) => {
  // Calculate rotation to show the correct face
  const getRotation = (value) => {
    switch(value) {
      case 1: return { x: 0, y: 0 };      // front
      case 2: return { x: 0, y: 180 };    // back
      case 3: return { x: 0, y: -90 };    // left
      case 4: return { x: 0, y: 90 };     // right
      case 5: return { x: -90, y: 0 };    // top
      case 6: return { x: 90, y: 0 };     // bottom
      default: return { x: 0, y: 0 };
    }
  };

  const rotation = getRotation(value);

  return (
    <div 
      className="dice"
      style={{
        '--final-x': `${rotation.x}deg`,
        '--final-y': `${rotation.y}deg`
      }}
    >
      <div className="dice-face front face-1">
        <DiceFace value={1} />
      </div>
      <div className="dice-face back face-2">
        <DiceFace value={2} />
      </div>
      <div className="dice-face right face-4">
        <DiceFace value={4} />
      </div>
      <div className="dice-face left face-3">
        <DiceFace value={3} />
      </div>
      <div className="dice-face top face-5">
        <DiceFace value={5} />
      </div>
      <div className="dice-face bottom face-6">
        <DiceFace value={6} />
      </div>
    </div>
  );
};

export default Dice3D;