// frontend/src/hooks/useNotification.js
import { useState } from 'react';

export const useNotification = () => {
  const [notification, setNotification] = useState(null);

  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
  };

  const hideNotification = () => {
    setNotification(null);
  };

  const notify = {
    info: (message) => showNotification(message, 'info'),
    success: (message) => showNotification(message, 'success'),
    error: (message) => showNotification(message, 'error'),
    warning: (message) => showNotification(message, 'warning'),
  };

  return {
    notification,
    showNotification,
    hideNotification,
    notify
  };
};
