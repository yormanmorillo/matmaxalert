import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Shift } from '../types';
import {
  getShifts,
  addShift as addShiftInDb,
  updateShift as updateShiftInDb,
  deleteShift as deleteShiftInDb
} from '../services/shiftService';

interface ShiftContextType {
  shifts: Shift[];
  loadingShifts: boolean;
  addShift: (shiftData: Omit<Shift, 'id'>) => Promise<Shift | null>;
  updateShift: (shiftId: string, shiftData: Partial<Shift>) => Promise<Shift | null>;
  deleteShift: (shiftId: string) => Promise<boolean>;
  getShiftById: (shiftId: string) => Shift | undefined;
  refreshShifts: () => void;
}

export const ShiftContext = createContext<ShiftContextType | undefined>(undefined);

export const ShiftProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loadingShifts, setLoadingShifts] = useState<boolean>(true);

  const loadShifts = useCallback(async () => {
    setLoadingShifts(true);
    try {
      const fetchedShifts = await getShifts();
      setShifts(fetchedShifts);
    } catch (e) {
      console.error('Failed to load shifts:', e);
    } finally {
      setLoadingShifts(false);
    }
  }, []);

  useEffect(() => {
    loadShifts();
  }, [loadShifts]);

  const addShift = async (shiftData: Omit<Shift, 'id'>): Promise<Shift | null> => {
    const result = await addShiftInDb(shiftData);
    if (result) loadShifts();
    return result;
  };

  const updateShift = async (shiftId: string, shiftData: Partial<Shift>): Promise<Shift | null> => {
    const result = await updateShiftInDb(shiftId, shiftData);
    if (result) loadShifts();
    return result;
  };

  const deleteShift = async (shiftId: string): Promise<boolean> => {
    const result = await deleteShiftInDb(shiftId);
    if (result) loadShifts();
    return result;
  };

  const getShiftById = (shiftId: string): Shift | undefined => {
    return shifts.find(s => s.id === shiftId);
  };

  const refreshShifts = useCallback(() => {
    loadShifts();
  }, [loadShifts]);

  return (
    <ShiftContext.Provider value={{ shifts, loadingShifts, addShift, updateShift, deleteShift, getShiftById, refreshShifts }}>
      {children}
    </ShiftContext.Provider>
  );
};