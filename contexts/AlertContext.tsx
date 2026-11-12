import React, { createContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { Alert, AlertStatus } from '../types';
import { getAlerts, createAlert as createAlertInDb, updateAlert as updateAlertInDb } from '../services/alertService';
import { normalizeId } from '../services/api';

interface AlertContextType {
  alerts: Alert[];
  loadingAlerts: boolean;
  isConnected: boolean;
  error: string | null;
  createAlert: (type: string, pressId: string, notes?: string, reportedBy?: string) => Promise<Alert | null>;
  updateAlertStatus: (alertId: string, status: AlertStatus, notes?: string, otherUpdates?: Partial<Alert>) => Promise<Alert | null>;
  getAlertsForPress: (pressId: string) => Alert[];
  getAlertsByType: (type: string) => Alert[];
  getActiveAlerts: () => Alert[];
  refreshAlerts: () => void;
}

export const AlertContext = createContext<AlertContextType | undefined>(undefined);

// WebSocket URL — en dev el proxy de Vite (socket.io) redirige automáticamente
const WS_URL = import.meta.env.VITE_WS_URL || undefined;

// Ventana de historial que se carga en los paneles. El backend acota igualmente.
const ALERTS_WINDOW = 2000;

export const AlertProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState<boolean>(true);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Ref para tomar snapshots fuera de los updaters de estado (rollback fiable).
  const alertsRef = useRef<Alert[]>(alerts);
  alertsRef.current = alerts;

  const loadAlerts = useCallback(async () => {
    setLoadingAlerts(true);
    try {
      const fetchedAlerts = await getAlerts({ limit: ALERTS_WINDOW });
      setAlerts((prev) => {
        // Conservar solo las alertas optimistas aún no confirmadas; el resto
        // se reemplaza por la verdad del servidor (así desaparecen borradas).
        const pending = prev.filter((alert) => String(alert.id).startsWith('temp-'));
        return [...pending, ...fetchedAlerts];
      });
      setError(null);
    } catch (err) {
      console.error('Failed to load alerts:', err);
      setError('No se pudieron cargar las alertas. Comprueba la conexión con el servidor.');
    } finally {
      setLoadingAlerts(false);
    }
  }, []);

  useEffect(() => {
    loadAlerts();

    const socket: Socket = WS_URL ? io(WS_URL) : io();

    socket.on('connect', () => {
      setIsConnected(true);
      setError(null);
      // Re-sincronizar al (re)conectar para no perder eventos
      loadAlerts();
    });

    socket.on('connect_error', () => {
      setIsConnected(false);
      setError('Sin conexión en tiempo real con el servidor.');
    });

    socket.on('alert:created', (newAlert: Alert) => {
      const normalized = normalizeId(newAlert);
      setAlerts((prev) => {
        if (prev.some((a) => String(a.id) === String(normalized.id))) return prev;
        // Sustituye la alerta optimista de la misma prensa y tipo.
        const withoutOptimistic = prev.filter((a) =>
          !(String(a.id).startsWith('temp-') && a.pressId === normalized.pressId && a.type === normalized.type)
        );
        return [normalized, ...withoutOptimistic];
      });
    });

    socket.on('alert:updated', (updatedAlert: Alert) => {
      const normalized = normalizeId(updatedAlert);
      setAlerts((prev) =>
        prev.map((a) => String(a.id) === String(normalized.id) ? { ...a, ...normalized } : a)
      );
    });

    socket.on('alert:deleted', ({ id }: { id: string }) => {
      setAlerts((prev) => prev.filter((a) => String(a.id) !== String(id)));
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    return () => {
      socket.disconnect();
    };
  }, [loadAlerts]);

  const createAlert = async (
    type: string,
    pressId: string,
    notes?: string,
    reportedBy?: string
  ): Promise<Alert | null> => {
    const tempId = `temp-${Date.now()}`;
    const optimisticAlert: Alert = {
      id: tempId,
      type,
      status: AlertStatus.ACTIVE,
      pressId,
      timestamp: Date.now(),
      notes,
      reportedBy,
      pressName: 'Procesando...',
      areaName: '...',
    };

    setAlerts((prev) => [optimisticAlert, ...prev]);

    try {
      const created = await createAlertInDb({ type, pressId, notes, reportedBy });
      if (created) {
        const normalized = normalizeId(created);
        setAlerts((prev) => {
          const socketBeatHttp = prev.some((a) => String(a.id) === String(normalized.id));
          if (socketBeatHttp) return prev.filter((a) => String(a.id) !== tempId);
          return prev.map((a) => String(a.id) === tempId ? normalized : a);
        });
        return normalized;
      }
      setAlerts((prev) => prev.filter((a) => String(a.id) !== tempId));
      return null;
    } catch (e) {
      console.error('Failed to create alert', e);
      setAlerts((prev) => prev.filter((a) => String(a.id) !== tempId));
      return null;
    }
  };

  const updateAlertStatus = async (
    alertId: string,
    status: AlertStatus,
    notes?: string,
    otherUpdates?: Partial<Alert>
  ): Promise<Alert | null> => {
    // Snapshot ANTES de actualizar (no dentro del updater: StrictMode lo ejecuta dos veces).
    const previousAlert = alertsRef.current.find((a) => String(a.id) === String(alertId));

    setAlerts((prev) =>
      prev.map((a) =>
        String(a.id) === String(alertId)
          ? { ...a, status, notes: notes || a.notes, ...otherUpdates }
          : a
      )
    );

    try {
      const updates: Partial<Alert> = { status, ...otherUpdates };
      if (notes) updates.notes = notes;

      const updated = await updateAlertInDb(alertId, updates);
      if (updated) {
        const normalized = normalizeId(updated);
        setAlerts((prev) => prev.map((a) => String(a.id) === String(alertId) ? { ...a, ...normalized } : a));
        return normalized;
      }

      if (previousAlert) {
        setAlerts((prev) => prev.map((a) => String(a.id) === String(alertId) ? previousAlert : a));
      }
      return null;
    } catch (e) {
      console.error('Failed to update alert', e);
      if (previousAlert) {
        setAlerts((prev) => prev.map((a) => String(a.id) === String(alertId) ? previousAlert : a));
      }
      return null;
    }
  };

  const getAlertsForPress = (pressId: string) => alerts.filter((a) => String(a.pressId) === String(pressId));
  const getAlertsByType = (type: string) => alerts.filter((a) => a.type === type);
  const getActiveAlerts = () => alerts.filter((a) => a.status === AlertStatus.ACTIVE || a.status === AlertStatus.WORKING);
  const refreshAlerts = useCallback(() => { loadAlerts(); }, [loadAlerts]);

  return (
    <AlertContext.Provider value={{
      alerts,
      loadingAlerts,
      isConnected,
      error,
      createAlert,
      updateAlertStatus,
      getAlertsForPress,
      getAlertsByType,
      getActiveAlerts,
      refreshAlerts,
    }}>
      {children}
    </AlertContext.Provider>
  );
};
