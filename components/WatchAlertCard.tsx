

import React, { useEffect, useRef, useState } from 'react';
import { Alert, AlertStatus, SOS_ALERT_TYPE, User } from '../types';
import { useAlerts } from '../hooks/useAlerts';
import { usePresses } from '../hooks/usePresses';
import { useAreas } from '../hooks/useAreas';
import toast from 'react-hot-toast';

interface WatchAlertCardProps {
  alert: Alert;
  actor: User | null;
}

const ALERT_STATUS_COLORS: Record<AlertStatus, string> = {
    [AlertStatus.ACTIVE]: 'bg-status_active',
    [AlertStatus.WORKING]: 'bg-status_working',
    [AlertStatus.RESOLVED]: 'bg-status_resolved',
    [AlertStatus.CANCELLED]: 'bg-gray-500',
};

const ESCALATE_AFTER_MS = 5 * 60 * 1000; // ACTIVE for 5 min without anyone taking it
const HOLD_TO_RESOLVE_MS = 800;          // long-press duration to resolve

const formatElapsed = (ms: number): string => {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const mm = String(minutes).padStart(2, '0');
    const ss = String(seconds).padStart(2, '0');
    return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
};

const WatchAlertCard: React.FC<WatchAlertCardProps> = ({ alert, actor }) => {
  const { updateAlertStatus } = useAlerts();
  const { presses } = usePresses();
  const { areas } = useAreas();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isHolding, setIsHolding] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const holdTimerRef = useRef<number | null>(null);

  // Ticking clock for the elapsed-time readout
  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, []);

  // Un long-press pendiente no debe disparar después de desmontar o si la
  // alerta cambia de estado por un evento socket.
  useEffect(() => () => {
    if (holdTimerRef.current !== null) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, [alert.status, alert.id]);

  const press = presses.find(p => p.id === alert.pressId);
  const displayPressName = alert.pressName || press?.name || alert.pressId;
  const area = areas.find(a => a.id === press?.areaId);
  const displayAreaName = alert.areaName || area?.name || 'Unknown Area';

  const canManageSos = alert.type !== SOS_ALERT_TYPE
    || (actor ? ['admin', 'supervisor'].includes(actor.role) : false);

  const isInteractive = !!(actor
    && (alert.status === AlertStatus.ACTIVE || alert.status === AlertStatus.WORKING)
    && canManageSos);
  const elapsed = now - alert.timestamp;
  const isEscalated = alert.status === AlertStatus.ACTIVE && elapsed >= ESCALATE_AFTER_MS;

  const takeAlert = async () => {
    if (!actor) return;
    setIsUpdating(true);
    try {
      const result = await updateAlertStatus(alert.id, AlertStatus.WORKING, undefined, {
          workingTimestamp: Date.now(),
          ...(alert.assignedTo ? {} : { assignedTo: actor.username }),
      });
      if (!result) toast.error('No se pudo tomar la alerta.');
    } finally {
      setIsUpdating(false);
    }
  };

  const resolveAlert = async () => {
    setIsUpdating(true);
    try {
      const result = await updateAlertStatus(alert.id, AlertStatus.RESOLVED);
      if (!result) toast.error('No se pudo resolver la alerta.');
    } finally {
      setIsUpdating(false);
    }
  };

  // Tap: only takes an ACTIVE alert. Tapping a WORKING alert does nothing (prevents accidents).
  const handleClick = () => {
    if (!isInteractive || isUpdating) return;
    if (alert.status === AlertStatus.ACTIVE) {
        takeAlert();
    }
  };

  // Long-press: resolves a WORKING alert. The progress bar gives visual feedback.
  const handleHoldStart = () => {
    if (!isInteractive || isUpdating || alert.status !== AlertStatus.WORKING) return;
    setIsHolding(true);
    holdTimerRef.current = window.setTimeout(() => {
        holdTimerRef.current = null;
        setIsHolding(false);
        resolveAlert();
    }, HOLD_TO_RESOLVE_MS);
  };

  const handleHoldEnd = () => {
    if (holdTimerRef.current !== null) {
        window.clearTimeout(holdTimerRef.current);
        holdTimerRef.current = null;
    }
    setIsHolding(false);
  };

  const actionHint = !canManageSos
      ? 'Solo supervisor'
      : alert.status === AlertStatus.ACTIVE
        ? 'Toca para tomar'
        : 'Mantén para resolver';

  return (
    <button
        onClick={handleClick}
        onPointerDown={handleHoldStart}
        onPointerUp={handleHoldEnd}
        onPointerLeave={handleHoldEnd}
        onPointerCancel={handleHoldEnd}
        onContextMenu={(e) => e.preventDefault()}
        disabled={!isInteractive || isUpdating}
        style={{ touchAction: 'pan-y' }}
        className={`relative w-full overflow-hidden p-4 rounded-lg shadow-lg text-white font-bold text-left transition-transform transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed select-none ${ALERT_STATUS_COLORS[alert.status]} ${isEscalated ? 'animate-escalate' : ''}`}
    >
        {isUpdating && <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg z-10"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-white"></div></div>}

        {/* Long-press progress bar (duration must match HOLD_TO_RESOLVE_MS) */}
        {isHolding && (
            <div className="absolute bottom-0 left-0 h-1.5 bg-white bg-opacity-80 animate-hold-progress" />
        )}

        <div className="flex justify-between items-center mb-1">
            <span className="text-xl font-extrabold truncate pr-2">{displayPressName}</span>
            <span className="text-xs px-2 py-1 bg-black bg-opacity-20 rounded-full shrink-0">{alert.status}</span>
        </div>
        <p className="text-base font-semibold truncate">{alert.type}</p>
        <p className="text-sm font-medium opacity-90 truncate mt-0.5">{displayAreaName}</p>
        <div className="flex justify-between items-center mt-2 pt-2 border-t border-white border-opacity-20">
            <p className="font-mono text-lg font-bold tracking-wider">{formatElapsed(elapsed)}</p>
            <p className="text-xs opacity-90">{new Date(alert.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
        </div>
        <div className="flex justify-between items-center mt-1">
            <p className="text-[10px] uppercase tracking-wide opacity-75">{actionHint}</p>
            {alert.assignedTo && <span className="text-[10px] font-bold uppercase tracking-wide bg-black bg-opacity-20 px-2 py-0.5 rounded-md truncate max-w-[60%] text-white">Tech: {alert.assignedTo}</span>}
        </div>
    </button>
  );
};

export default WatchAlertCard;
