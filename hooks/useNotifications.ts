import { useState, useEffect, useRef } from 'react';
import { Alert, AlertStatus } from '../types';
import { playNotificationSound, vibrateDevice, patternForAlertType } from '../services/notificationService';

const NOTIFICATION_MUTED_KEY = 'notificationsMuted';

// Reminders for alerts nobody has taken yet (status stays ACTIVE)
const REMINDER_AFTER_MS = 2 * 60 * 1000;  // start reminding after 2 min unattended
const REMINDER_EVERY_MS = 60 * 1000;      // then repeat every 60s
const REMINDER_SCAN_MS = 15 * 1000;       // scan interval

export const useNotifications = (alerts: Alert[], mode: 'sound' | 'vibration' = 'sound') => {
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    try {
        return localStorage.getItem(NOTIFICATION_MUTED_KEY) === 'true';
    } catch {
        return false;
    }
  });

  // Fix #9: flag separado en vez de inferir de Set vacío
  const initializedRef = useRef(false);
  const previousAlertIdsRef = useRef<Set<string>>(new Set());
  const lastReminderRef = useRef<Map<string, number>>(new Map());
  const alertsRef = useRef<Alert[]>(alerts);
  alertsRef.current = alerts;
  const isMutedRef = useRef(isMuted);
  isMutedRef.current = isMuted;

  useEffect(() => {
    const currentAlertIds = new Set(alerts.map(a => a.id));

    // Primera ejecución: solo establecer baseline, nunca notificar
    if (!initializedRef.current) {
      previousAlertIdsRef.current = currentAlertIds;
      initializedRef.current = true;
      return;
    }

    const newAlerts = alerts.filter(a => !previousAlertIdsRef.current.has(a.id));

    if (newAlerts.length > 0 && !isMuted) {
        if (mode === 'sound') {
            playNotificationSound();
        } else if (mode === 'vibration') {
            vibrateDevice(patternForAlertType(newAlerts[0].type));
        }
    }

    previousAlertIdsRef.current = currentAlertIds;

  }, [alerts, isMuted, mode]);

  // Recordatorio periódico: alertas ACTIVE que nadie ha tomado
  useEffect(() => {
    if (mode !== 'vibration') return;

    const scan = () => {
      if (isMutedRef.current) return;
      const now = Date.now();

      const unattended = alertsRef.current
        .filter(a =>
          a.status === AlertStatus.ACTIVE &&
          now - a.timestamp >= REMINDER_AFTER_MS &&
          now - (lastReminderRef.current.get(a.id) ?? 0) >= REMINDER_EVERY_MS
        )
        .sort((a, b) => a.timestamp - b.timestamp);

      if (unattended.length === 0) return;

      const oldest = unattended[0];
      vibrateDevice(patternForAlertType(oldest.type));
      // Marcar todas las escaneadas para no repetir hasta el próximo ciclo
      unattended.forEach(a => lastReminderRef.current.set(a.id, now));
    };

    const intervalId = window.setInterval(scan, REMINDER_SCAN_MS);
    return () => window.clearInterval(intervalId);
  }, [mode]);

  const toggleMute = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    try {
        localStorage.setItem(NOTIFICATION_MUTED_KEY, String(newMutedState));
    } catch (e) {
        console.error("Failed to save mute state to localStorage", e);
    }
  };

  return { isMuted, toggleMute };
};
