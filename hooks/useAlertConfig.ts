
import { useContext } from 'react';
import { AlertConfigContext } from '../contexts/AlertConfigContext';

export const useAlertConfig = () => {
  const context = useContext(AlertConfigContext);
  if (context === undefined) {
    throw new Error('useAlertConfig must be used within an AlertConfigProvider');
  }
  return context;
};
