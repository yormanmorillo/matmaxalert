import React, { useState, useMemo } from 'react';
import { usePresses } from '../hooks/usePresses';
import { useAlerts } from '../hooks/useAlerts';
import { useAreas } from '../hooks/useAreas';
import { AlertStatus, Press, SOS_ALERT_TYPE, User, Alert } from '../types';
import LoadingSpinner from './LoadingSpinner';
import toast from 'react-hot-toast';
import { useAlertConfig } from '../hooks/useAlertConfig';

interface PressStatusGridProps {
    actor: User | null;
    pressesToShow?: Press[];
}

const PressStatusGrid: React.FC<PressStatusGridProps> = ({ actor, pressesToShow }) => {
    const { presses: allPresses, loadingPresses, refreshPresses } = usePresses();
    const { alerts, loadingAlerts, refreshAlerts, updateAlertStatus } = useAlerts();
    const { buttonConfigs, loadingConfigs } = useAlertConfig();
    const { areas } = useAreas();

    const [updatingPressId, setUpdatingPressId] = useState<string | null>(null);

    const presses = useMemo(() => pressesToShow !== undefined ? pressesToShow : allPresses, [pressesToShow, allPresses]);

    const handleRefresh = () => {
        refreshAlerts();
        refreshPresses();
    };

    const allowedAlertTypes = useMemo(() => {
        if (!actor || !buttonConfigs) return new Set<string>();
        return new Set(
            buttonConfigs
                .filter(c => c.enabled && c.allowedRoles.includes(actor.role))
                .map(c => c.name)
        );
    }, [buttonConfigs, actor]);

    const pressStatuses = useMemo(() => {
        const statuses = new Map<string, {
            status: 'active' | 'working' | 'ok',
            cardClass: string,
            badgeClass: string,
            label: string,
            timestamp?: number,
            alertType?: string
        }>();

        // Agrupar una sola vez: O(alertas) en lugar de O(prensas × alertas).
        const byPress = new Map<string, Alert[]>();
        for (const alert of alerts) {
            if (alert.status !== AlertStatus.ACTIVE && alert.status !== AlertStatus.WORKING) continue;
            const key = String(alert.pressId);
            const list = byPress.get(key);
            if (list) list.push(alert);
            else byPress.set(key, [alert]);
        }

        presses.forEach(press => {
            const pressAlerts = byPress.get(String(press.id)) || [];
            const latestActive = pressAlerts
                .filter(a => a.status === AlertStatus.ACTIVE)
                .sort((a, b) => b.timestamp - a.timestamp)[0];
            const latestWorking = pressAlerts
                .filter(a => a.status === AlertStatus.WORKING)
                .sort((a, b) => b.timestamp - a.timestamp)[0];

            if (latestActive) {
                statuses.set(press.id, {
                    status: 'active',
                    cardClass: 'bg-red-600 border-red-700 text-white',
                    badgeClass: 'bg-white/20 text-white border border-white/30',
                    label: latestActive.type === SOS_ALERT_TYPE ? 'SOS' : 'ALERTA',
                    timestamp: latestActive.timestamp,
                    alertType: latestActive.type,
                });
            } else if (latestWorking) {
                statuses.set(press.id, {
                    status: 'working',
                    cardClass: 'bg-amber-300 border-amber-400 text-amber-950',
                    badgeClass: 'bg-amber-900/20 text-amber-950 border border-amber-900/20',
                    label: 'EN PROCESO',
                    timestamp: latestWorking.timestamp,
                    alertType: latestWorking.type,
                });
            } else {
                statuses.set(press.id, {
                    status: 'ok',
                    cardClass: 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100',
                    badgeClass: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
                    label: 'OK',
                });
            }
        });
        return statuses;
    }, [presses, alerts]);

    const handlePressClick = async (press: Press) => {
        if (!actor || updatingPressId) return;

        const pressStatus = pressStatuses.get(press.id);
        if (!pressStatus || pressStatus.status === 'ok') return;

        // SOS incluido: el servidor solo deja gestionarlo a supervisor/admin.
        const canTouch = (alert: Alert) =>
            alert.type === SOS_ALERT_TYPE
                ? ['admin', 'supervisor'].includes(actor.role)
                : allowedAlertTypes.has(alert.type);

        const actionable = alerts.filter(a =>
            String(a.pressId) === String(press.id) && canTouch(a)
        );

        const targetStatus = pressStatus.status === 'active' ? AlertStatus.WORKING : AlertStatus.RESOLVED;
        const toUpdate = actionable.filter(a => a.status === targetStatus);
        if (toUpdate.length === 0) {
            toast.error('No tienes permiso para gestionar las alertas de esta prensa.');
            return;
        }

        if (targetStatus === AlertStatus.RESOLVED && toUpdate.length > 1) {
            const confirmed = window.confirm(
                `Se van a resolver ${toUpdate.length} alertas de ${press.name}. ¿Continuar?`
            );
            if (!confirmed) return;
        }

        setUpdatingPressId(press.id);
        try {
            const results = await Promise.all(toUpdate.map(alert => {
                const updates: Partial<Alert> = {};
                if (targetStatus === AlertStatus.WORKING && !alert.assignedTo) {
                    updates.assignedTo = actor.username;
                }
                return updateAlertStatus(alert.id, targetStatus, undefined, updates);
            }));

            const failed = results.filter(result => !result).length;
            if (failed > 0) toast.error(`${failed} alerta(s) no se pudieron actualizar.`);
        } catch (error) {
            console.error('Failed to update alert statuses:', error);
            toast.error('No se pudieron actualizar las alertas.');
        } finally {
            setUpdatingPressId(null);
        }
    };

    const isLoading = loadingPresses || loadingAlerts || loadingConfigs;

    return (
        <div>
            <div className="flex justify-between items-center mb-5">
                 <div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Estado de Planta</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Monitoreo en vivo</p>
                 </div>
                 <button
                    onClick={handleRefresh}
                    disabled={isLoading}
                    className="px-4 h-10 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-sm rounded-md border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
                 >
                    {isLoading ? 'Sincronizando...' : 'Sincronizar'}
                 </button>
            </div>
            
            {isLoading ? <LoadingSpinner message="Cargando mapa..." /> : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                    {presses.map(press => {
                        const style = pressStatuses.get(press.id);
                        const isClickable = style && style.status !== 'ok' && actor && ['supervisor', 'technical', 'driver'].includes(actor.role);
                        const area = areas.find(a => a.id === press.areaId);
                        
                        return (
                            <button 
                                key={press.id} 
                                onClick={() => handlePressClick(press)}
                                disabled={!isClickable || !!updatingPressId}
                                className={`
                                    relative p-4 rounded-lg border-2 text-left transition-all
                                    flex flex-col justify-between h-36 overflow-hidden
                                    ${style?.cardClass}
                                    ${isClickable ? 'cursor-pointer hover:brightness-95 active:scale-[0.98]' : 'cursor-default'}
                                `}
                            >
                                <div className="flex justify-between items-start w-full">
                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${style?.badgeClass}`}>
                                        {style?.label}
                                    </span>
                                    {style?.status === 'active' && (
                                        <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse"></span>
                                    )}
                                </div>
                                
                                <div className="mt-2">
                                    <span className="block text-xl font-bold leading-tight">
                                        {press.name}
                                    </span>
                                    <span className={`text-xs font-medium block mt-0.5 ${style?.status === 'ok' ? 'text-slate-500 dark:text-slate-400' : 'opacity-80'}`}>
                                        {area?.name || 'Sin área'}
                                    </span>
                                    {style?.timestamp && (
                                         <span className={`text-[11px] font-semibold block mt-2 ${style?.status === 'ok' ? '' : 'opacity-75'}`}>
                                             {new Date(style.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} · {style.alertType}
                                         </span>
                                    )}
                                </div>

                                {updatingPressId === press.id && (
                                     <div className="absolute inset-0 bg-white/50 dark:bg-slate-800/50 flex items-center justify-center">
                                         <div className="w-6 h-6 border-2 border-slate-400 border-t-slate-700 dark:border-t-white rounded-full animate-spin"></div>
                                     </div>
                                )}
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    );
};

export default PressStatusGrid;