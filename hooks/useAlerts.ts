
import { useContext } from 'react';
import { AlertContext } from '../contexts/AlertContext';

export const useAlerts = () => {
  const context = useContext(AlertContext);
  if (context === undefined) {
    throw new Error('useAlerts must be used within an AlertProvider');
  }
  return context;
};
