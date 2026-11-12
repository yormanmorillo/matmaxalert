import { useEffect, useMemo, useState } from 'react';
import { useAlerts } from './useAlerts';
import { AlertStatus, SOS_ALERT_TYPE } from '../types';
import { startSiren, stopSiren, vibrateDevice } from '../services/notificationService';

/**
 * Watches for active SOS alerts and drives the global alarm.
 *
 * Un SOS sigue activo hasta que se RESUELVE o CANCELA (aunque un técnico
 * lo pase a WORKING): antes, "tomar" la alerta silenciaba la sirena en toda
 * la planta con la emergencia todavía abierta.
 *
 * El silencio es local por dispositivo y por id de SOS: si llega una nueva
 * emergencia, vuelve a sonar.
 */
export const useSosAlarm = () => {
  const { alerts } = useAlerts();
  const [silencedIds, setSilencedIds] = useState<Set<string>>(() => new Set());

  const activeSosList = useMemo(() =>
    alerts
      .filter((alert) =>
        alert.type === SOS_ALERT_TYPE
        && alert.status !== AlertStatus.RESOLVED
        && alert.status !== AlertStatus.CANCELLED
      )
      .sort((a, b) => b.timestamp - a.timestamp),
  [alerts]);

  const activeSos = activeSosList[0] || null;
  const activeSosId = activeSos?.id ?? null;
  const isSilenced = activeSosId !== null && silencedIds.has(String(activeSosId));

  useEffect(() => {
    if (activeSosId && !isSilenced) {
      startSiren();
      vibrateDevice([500, 200, 500, 200, 800]);
      return () => stopSiren();
    }
    stopSiren();
    return undefined;
  }, [activeSosId, isSilenced]);

  const silence = () => {
    if (!activeSosId) return;
    setSilencedIds((prev) => {
      const next = new Set(prev);
      next.add(String(activeSosId));
      return next;
    });
  };

  return { activeSos, activeSosList, isSilenced, silence };
};
