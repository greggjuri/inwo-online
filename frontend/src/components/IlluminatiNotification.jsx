// frontend/src/components/IlluminatiNotification.jsx
import React from 'react';
import './IlluminatiNotification.css';

const IlluminatiNotification = ({ message, onClose, type = 'info' }) => {
  return (
    <div className="illuminati-notification-overlay" onClick={onClose}>
      <div className="illuminati-notification-box" onClick={(e) => e.stopPropagation()}>
        <div className="notification-header">
          <div className="header-eye">👁️</div>
          <div className="header-lines">
            <div className="header-line"></div>
            <div className="header-line"></div>
          </div>
        </div>
        
        <div className={`notification-content ${type}`}>
          <div className="notification-icon">
            {type === 'success' && '✓'}
            {type === 'error' && '⚠'}
            {type === 'warning' && '⚡'}
            {type === 'info' && '◈'}
          </div>
          <div className="notification-message">{message}</div>
        </div>
        
        <div className="notification-footer">
          <button className="notification-btn" onClick={onClose}>
            <span className="btn-text">FNORD</span>
            <div className="btn-glow"></div>
          </button>
        </div>
        
        <div className="notification-corner top-left"></div>
        <div className="notification-corner top-right"></div>
        <div className="notification-corner bottom-left"></div>
        <div className="notification-corner bottom-right"></div>
      </div>
    </div>
  );
};

export default IlluminatiNotification;
