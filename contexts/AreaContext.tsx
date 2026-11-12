import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Area } from '../types';
import {
  getAreas,
  addArea as addAreaInDb,
  updateArea as updateAreaInDb,
  deleteArea as deleteAreaInDb
} from '../services/areaService';

interface AreaContextType {
  areas: Area[];
  loadingAreas: boolean;
  addArea: (areaData: Omit<Area, 'id'>) => Promise<Area | null>;
  updateArea: (areaId: string, areaData: Partial<Area>) => Promise<Area | null>;
  deleteArea: (areaId: string) => Promise<boolean>;
  getAreaById: (areaId: string) => Area | undefined;
  refreshAreas: () => void;
}

export const AreaContext = createContext<AreaContextType | undefined>(undefined);

export const AreaProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [areas, setAreas] = useState<Area[]>([]);
  const [loadingAreas, setLoadingAreas] = useState<boolean>(true);

  const loadAreas = useCallback(async () => {
    setLoadingAreas(true);
    try {
      const fetchedAreas = await getAreas();
      setAreas(fetchedAreas);
    } catch (e) {
      console.error('Failed to load areas:', e);
    } finally {
      setLoadingAreas(false);
    }
  }, []);

  useEffect(() => {
    loadAreas();
  }, [loadAreas]);

  const addArea = async (areaData: Omit<Area, 'id'>): Promise<Area | null> => {
    const result = await addAreaInDb(areaData);
    if (result) loadAreas();
    return result;
  };

  const updateArea = async (areaId: string, areaData: Partial<Area>): Promise<Area | null> => {
    const result = await updateAreaInDb(areaId, areaData);
    if (result) loadAreas();
    return result;
  };

  const deleteArea = async (areaId: string): Promise<boolean> => {
    const result = await deleteAreaInDb(areaId);
    if (result) loadAreas();
    return result;
  };

  const getAreaById = (areaId: string): Area | undefined => {
    return areas.find(s => s.id === areaId);
  };

  const refreshAreas = useCallback(() => {
    loadAreas();
  }, [loadAreas]);

  return (
    <AreaContext.Provider value={{ areas, loadingAreas, addArea, updateArea, deleteArea, getAreaById, refreshAreas }}>
      {children}
    </AreaContext.Provider>
  );
};