
import { useContext } from 'react';
import { ShiftContext } from '../contexts/ShiftContext';

export const useShifts = () => {
  const context = useContext(ShiftContext);
  if (context === undefined) {
    throw new Error('useShifts must be used within a ShiftProvider');
  }
  return context;
};