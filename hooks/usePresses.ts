
import { useContext } from 'react';
import { PressContext } from '../contexts/PressContext';

export const usePresses = () => {
  const context = useContext(PressContext);
  if (context === undefined) {
    throw new Error('usePresses must be used within a PressProvider');
  }
  return context;
};
