import { useContext } from 'react';
import { AreaContext } from '../contexts/AreaContext';

export const useAreas = () => {
  const context = useContext(AreaContext);
  if (context === undefined) {
    throw new Error('useAreas must be used within a AreaProvider');
  }
  return context;
};