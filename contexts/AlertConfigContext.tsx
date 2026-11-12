import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { AlertButtonConfig } from '../types';
import { apiFetch } from '../services/api';

interface AlertConfigContextType {
  buttonConfigs: AlertButtonConfig[];
  loadingConfigs: boolean;
  updateButtonConfigs: (newConfigs: AlertButtonConfig[]) => Promise<boolean>;
  getEnabledButtonConfigs: () => AlertButtonConfig[];
}

export const AlertConfigContext = createContext<AlertConfigContextType | undefined>(undefined);

export const AlertConfigProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [buttonConfigs, setButtonConfigs] = useState<AlertButtonConfig[]>([]);
  const [loadingConfigs, setLoadingConfigs] = useState<boolean>(true);

  const loadConfigs = useCallback(async () => {
    setLoadingConfigs(true);
    try {
      const configs = await apiFetch('/alert-config');
      setButtonConfigs(configs.sort((a: any, b: any) => a.order - b.order));
    } catch (error) {
      console.error("Failed to load alert button configs:", error);
    } finally {
      setLoadingConfigs(false);
    }
  }, []);

  useEffect(() => {
    loadConfigs();
  }, [loadConfigs]);

  // Fix #14: devuelve boolean para que la UI solo muestre éxito si realmente se guardó
  const updateButtonConfigs = useCallback(async (newConfigs: AlertButtonConfig[]): Promise<boolean> => {
    try {
      await apiFetch('/alert-config', {
        method: 'PUT',
        body: JSON.stringify(newConfigs),
      });
      const sortedConfigs = [...newConfigs].sort((a, b) => a.order - b.order);
      setButtonConfigs(sortedConfigs);
      return true;
    } catch (error) {
      console.error("Failed to update alert button configs:", error);
      return false;
    }
  }, []);

  const getEnabledButtonConfigs = useCallback((): AlertButtonConfig[] => {
    return buttonConfigs.filter(config => config.enabled).sort((a,b) => a.order - b.order);
  }, [buttonConfigs]);

  return (
    <AlertConfigContext.Provider value={{ buttonConfigs, loadingConfigs, updateButtonConfigs, getEnabledButtonConfigs }}>
      {children}
    </AlertConfigContext.Provider>
  );
};