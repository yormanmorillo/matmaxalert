import React, { useEffect, useRef, useState } from 'react';
import { Alert, AlertStatus, SOS_ALERT_TYPE, User } from '../types';
import { WrenchScrewdriverIcon, MapPinIcon, ExclamationTriangleIcon, BoltIcon, BoxIcon, CogIcon } from '../constants';
import { useAlerts } from '../hooks/useAlerts';
import { usePresses } from '../hooks/usePresses';
import { useAreas } from '../hooks/useAreas';
import toast from 'react-hot-toast';

interface AlertCardProps {
  alert: Alert;
  actor?: User | null; 
}

// Colors chosen for distance legibility: solid blocks, high contrast, no neon glare
const STATUS_CONFIG: Record<AlertStatus, { bar: string, badge: string, label: string, card: string }> = {
    [AlertStatus.ACTIVE]: {
        bar: 'bg-red-600',
        badge: 'bg-white/20 text-white border border-white/30',
        label: 'Activa',
        card: 'bg-red-600 border-red-700 text-white dark:bg-red-600 dark:border-red-700',
    },
    [AlertStatus.WORKING]: {
        bar: 'bg-amber-400',
        badge: 'bg-amber-900/20 text-amber-950 border border-amber-900/20',
        label: 'En proceso',
        card: 'bg-amber-300 border-amber-400 text-amber-950 dark:bg-amber-300 dark:border-amber-400 dark:text-amber-950',
    },
    [AlertStatus.RESOLVED]: {
        bar: 'bg-emerald-600',
        badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
        label: 'Resuelta',
        card: 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700 text-slate-800 dark:text-slate-100',
    },
    [AlertStatus.CANCELLED]: {
        bar: 'bg-slate-400',
        badge: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600',
        label: 'Cancelada',
        card: 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700 text-slate-800 dark:text-slate-100',
    },
};

const getIconForType = (type: string) => {
    // Normalizar acentos: la configuración usa nombres en español ("Mecánica").
    const key = type.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const className = "w-4 h-4";
    if (key.includes('mech') || key.includes('mec')) return <CogIcon className={className} />;
    if (key.includes('elec')) return <BoltIcon className={className} />;
    if (key.includes('mat')) return <BoxIcon className={className} />;
    if (key.includes('qual') || key.includes('calidad')) return <ExclamationTriangleIcon className={className} />;
    return <WrenchScrewdriverIcon className={className} />;
};

const AlertCard: React.FC<AlertCardProps> = ({ alert, actor }) => {
  const { updateAlertStatus } = useAlerts();
  const { presses } = usePresses();
  const { areas } = useAreas();
  const [isUpdating, setIsUpdating] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // Reloj compartido por tarjeta: antes el "hace X min" quedaba congelado.
  useEffect(() => {
    const intervalId = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(intervalId);
  }, []);

  const press = presses.find(p => String(p.id) === String(alert.pressId));
  const displayPressName = alert.pressName || press?.name || alert.pressId;
  const area = areas.find(a => a.id === press?.areaId);
  const displayAreaName = alert.areaName || area?.name || 'Sin área';

  const canManageSos = alert.type !== SOS_ALERT_TYPE
    || (actor ? ['admin', 'supervisor'].includes(actor.role) : false);

  const isInteractive = !!(actor
    && ['supervisor', 'technical', 'driver'].includes(actor.role)
    && (alert.status === AlertStatus.ACTIVE || alert.status === AlertStatus.WORKING)
    && canManageSos);

  const [isHolding, setIsHolding] = useState(false);
  const holdTimerRef = useRef<number | null>(null);

  const clearHold = () => {
    if (holdTimerRef.current !== null) {
      window.clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    setIsHolding(false);
  };

  // Un toque accidental no puede cerrar una alerta para siempre (backend no reabre).
  // Para resolver hay que mantener presionado 800 ms, igual que en el watch.
  const startHold = () => {
    if (!isInteractive || isUpdating || alert.status !== AlertStatus.WORKING) return;
    setIsHolding(true);
    holdTimerRef.current = window.setTimeout(() => {
      holdTimerRef.current = null;
      setIsHolding(false);
      resolveAlert();
    }, 800);
  };

  useEffect(() => () => {
    if (holdTimerRef.current !== null) window.clearTimeout(holdTimerRef.current);
  }, [alert.id, alert.status]);

  const resolveAlert = async () => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      const result = await updateAlertStatus(alert.id, AlertStatus.RESOLVED);
      if (!result) toast.error('No se pudo resolver la alerta. Intenta de nuevo.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleClick = async () => {
    if (!isInteractive || isUpdating) return;
    // WORKING se resuelve con long-press, no con un toque.
    if (alert.status !== AlertStatus.ACTIVE) return;

    setIsUpdating(true);
    try {
      const updates: Partial<Alert> = {};
      if (!alert.assignedTo && actor) updates.assignedTo = actor.username;

      const result = await updateAlertStatus(alert.id, AlertStatus.WORKING, undefined, updates);
      if (!result) toast.error('No se pudo atender la alerta. Intenta de nuevo.');
    } finally {
      setIsUpdating(false);
    }
  };

  const style = STATUS_CONFIG[alert.status];
  const isUrgent = alert.status === AlertStatus.ACTIVE || alert.status === AlertStatus.WORKING;
  const elapsedMinutes = Math.floor((now - alert.timestamp) / 60000);
  const timeAgoText = elapsedMinutes < 1 ? 'Ahora' : elapsedMinutes < 60 ? `${elapsedMinutes} min` : `${Math.floor(elapsedMinutes / 60)}h ${elapsedMinutes % 60}m`;

  return (
    <div
        onClick={handleClick}
        onPointerDown={startHold}
        onPointerUp={clearHold}
        onPointerLeave={clearHold}
        onPointerCancel={clearHold}
        onContextMenu={(event) => event.preventDefault()}
        role={isInteractive ? 'button' : undefined}
        tabIndex={isInteractive ? 0 : undefined}
        onKeyDown={(event) => {
          if (isInteractive && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            if (alert.status === AlertStatus.ACTIVE) {
              handleClick();
            } else if (alert.status === AlertStatus.WORKING && window.confirm('¿Resolver esta alerta?')) {
              resolveAlert();
            }
          }
        }}
        aria-label={isInteractive ? `${alert.type} en ${displayPressName}: ${alert.status === AlertStatus.ACTIVE ? 'atender' : 'mantener presionado para resolver'}` : undefined}
        className={`
            relative overflow-hidden rounded-lg border-2 ${style.card}
            ${isInteractive ? 'cursor-pointer active:brightness-95' : ''}
            transition-colors
        `}
    >
        {/* Status bar (only on non-urgent cards, urgent ones are already a solid block) */}
        {!isUrgent && <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${style.bar}`}></div>}

        <div className={`px-4 py-4 ${!isUrgent ? 'pl-5' : ''}`}>
            {/* Header: status + time */}
            <div className="flex justify-between items-center mb-3">
                 <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide ${style.badge}`}>
                     {alert.status === AlertStatus.ACTIVE && (
                         <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                     )}
                     {style.label}
                 </span>
                 <span className={`text-xs font-semibold ${isUrgent ? 'opacity-80' : 'text-slate-500 dark:text-slate-400'}`}>
                     {timeAgoText}
                 </span>
            </div>

            {/* Press + Area */}
            <div className="mb-3">
                 <h3 className="text-lg font-extrabold leading-tight">
                     {displayPressName}
                 </h3>
                 <div className={`flex items-center text-sm mt-0.5 ${isUrgent ? 'opacity-85' : 'text-slate-500 dark:text-slate-400'}`}>
                     <MapPinIcon className="w-3.5 h-3.5 mr-1" />
                     <span>{displayAreaName}</span>
                 </div>
            </div>

            {/* Alert type */}
            <div className={`flex items-center gap-2 py-2 px-3 rounded-md border ${
                isUrgent
                    ? 'bg-black/15 border-black/10'
                    : 'bg-slate-50 dark:bg-slate-700/50 border-slate-100 dark:border-slate-700'
            }`}>
                 <span className={isUrgent ? 'opacity-90' : 'text-slate-500 dark:text-slate-400'}>{getIconForType(alert.type)}</span>
                 <span className="text-sm font-bold">
                     {alert.type}
                 </span>
            </div>

            {alert.notes && (
                <p className={`text-sm mt-2 leading-snug ${isUrgent ? 'opacity-90' : 'text-slate-600 dark:text-slate-300'}`}>
                    {alert.notes}
                </p>
            )}

            {/* Footer */}
            <div className={`flex items-center justify-between mt-3 pt-2 border-t ${isUrgent ? 'border-white/25' : 'border-slate-100 dark:border-slate-700'}`}>
                 <span className={`text-xs ${isUrgent ? 'opacity-80' : 'text-slate-500 dark:text-slate-400'}`}>
                     {new Date(alert.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                 </span>
                 {alert.assignedTo && (
                     <span className={`text-xs font-medium ${isUrgent ? 'opacity-90' : 'text-slate-600 dark:text-slate-300'}`}>
                         Téc: <span className="font-bold">{alert.assignedTo}</span>
                     </span>
                 )}
                 {isInteractive && (
                     <span className={`text-xs font-bold ${isUrgent ? 'underline underline-offset-2' : 'text-primary-600 dark:text-primary-400'}`}>
                         {alert.status === AlertStatus.ACTIVE ? 'Tocar para atender →' : 'Mantén presionado para resolver'}
                     </span>
                 )}
            </div>
        </div>

        {isHolding && (
            <div className="absolute bottom-0 left-0 h-1.5 bg-white/80 animate-hold-progress" />
        )}

        {isUpdating && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-20">
                <div className="w-6 h-6 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
            </div>
        )}
    </div>
  );
};

export default AlertCard;