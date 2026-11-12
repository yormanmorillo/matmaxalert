import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Press } from '../types';
import {
  getPresses,
  addPress as addPressInDb,
  updatePress as updatePressInDb,
  deletePress as deletePressInDb,
} from '../services/pressService';

interface PressContextType {
  presses: Press[];
  loadingPresses: boolean;
  addPress: (pressData: Omit<Press, 'id'>) => Promise<Press | null>;
  updatePress: (pressId: string, pressData: Partial<Press>) => Promise<Press | null>;
  deletePress: (pressId: string) => Promise<boolean>;
  getPressById: (pressId: string) => Press | undefined;
  refreshPresses: () => void;
}

export const PressContext = createContext<PressContextType | undefined>(undefined);

export const PressProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [presses, setPresses] = useState<Press[]>([]);
  const [loadingPresses, setLoadingPresses] = useState<boolean>(true);

  // Fix #10: try/catch + deps vacías (sin refetch loop)
  const loadPresses = useCallback(async () => {
    setLoadingPresses(true);
    try {
      const fetchedPresses = await getPresses();
      setPresses(fetchedPresses);
    } catch (e) {
      console.error('Failed to load presses:', e);
    } finally {
      setLoadingPresses(false);
    }
  }, []);

  useEffect(() => {
    loadPresses();
  }, [loadPresses]);

  const addPress = async (pressData: Omit<Press, 'id'>): Promise<Press | null> => {
    const result = await addPressInDb(pressData);
    if (result) loadPresses();
    return result;
  };

  const updatePress = async (pressId: string, pressData: Partial<Press>): Promise<Press | null> => {
    const result = await updatePressInDb(pressId, pressData);
    if (result) loadPresses();
    return result;
  };

  const deletePress = async (pressId: string): Promise<boolean> => {
    const result = await deletePressInDb(pressId);
    if (result) loadPresses();
    return result;
  };

  const getPressById = (pressId: string): Press | undefined => {
    return presses.find(p => p.id === pressId);
  };

  const refreshPresses = useCallback(() => {
    loadPresses();
  }, [loadPresses]);

  return (
    <PressContext.Provider value={{ presses, loadingPresses, addPress, updatePress, deletePress, getPressById, refreshPresses }}>
      {children}
    </PressContext.Provider>
  );
};