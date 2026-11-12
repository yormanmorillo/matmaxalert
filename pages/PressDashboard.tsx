import React, { useEffect, useRef, useState } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { useAlerts } from '../hooks/useAlerts';
import { AlertStatus, SOS_ALERT_TYPE } from '../types';
import PressSelector from '../components/PressSelector';
import LoadingSpinner from '../components/LoadingSpinner';
import PanelHeader from '../components/PanelHeader';
import { useAlertConfig } from '../hooks/useAlertConfig';
import { PressMachineIcon, CogIcon, BoltIcon, BoxIcon, QualityIcon, WrenchScrewdriverIcon, SparklesIcon, ExclamationTriangleIcon } from '../constants';
import { usePresses } from '../hooks/usePresses';

const PressDashboard: React.FC = () => {
  const navigate = ReactRouterDOM.useNavigate();
  const { createAlert, alerts, updateAlertStatus, loadingAlerts } = useAlerts();
  const { presses } = usePresses();
  const { buttonConfigs, loadingConfigs } = useAlertConfig();
  
  const [selectedPressId, setSelectedPressId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);
  const [isHoldingSos, setIsHoldingSos] = useState(false);
  const sosHoldTimerRef = useRef<number | null>(null);
  const feedbackTimerRef = useRef<number | null>(null);

  const scheduleFeedbackClear = (delayMs: number) => {
    if (feedbackTimerRef.current !== null) window.clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = window.setTimeout(() => {
      setFeedbackMessage(null);
      feedbackTimerRef.current = null;
    }, delayMs);
  };

  // Al salir del panel no debe quedar un SOS a medio disparar ni un toast vivo.
  useEffect(() => () => {
    if (sosHoldTimerRef.current !== null) window.clearTimeout(sosHoldTimerRef.current);
    if (feedbackTimerRef.current !== null) window.clearTimeout(feedbackTimerRef.current);
  }, []);

  const selectedPress = selectedPressId ? presses.find(p => p.id === selectedPressId) : null;
  const activeAlertsOnPress = selectedPressId ? alerts.filter(a => a.pressId === selectedPressId && (a.status === AlertStatus.ACTIVE || a.status === AlertStatus.WORKING)) : [];
  const sosActiveOnPress = activeAlertsOnPress.some(a => a.type === SOS_ALERT_TYPE);

  const alertButtons = buttonConfigs
    .filter(config => {
      if (!config.enabled || !config.allowedRoles.includes('press')) return false;
      if (!config.allowedPressIds || config.allowedPressIds.length === 0) return true;
      return selectedPressId ? config.allowedPressIds.includes(selectedPressId) : false;
    })
    .sort((a, b) => a.order - b.order);

  const getIconForType = (type: string) => {
      // Se prueba primero el id estable de la config y luego el nombre normalizado.
      const key = type.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (key.includes('mech') || key.includes('mec')) return <CogIcon className="w-8 h-8" />;
      if (key.includes('elec')) return <BoltIcon className="w-8 h-8" />;
      if (key.includes('mat')) return <BoxIcon className="w-8 h-8" />;
      if (key.includes('qual') || key.includes('calidad')) return <QualityIcon className="w-8 h-8" />;
      if (key.includes('maint') || key.includes('manten')) return <WrenchScrewdriverIcon className="w-8 h-8" />;
      return <SparklesIcon className="w-8 h-8" />;
  };

  const getButtonStatus = (type: string) => {
      const alert = activeAlertsOnPress.find(a => a.type === type);
      if (alert) {
          return alert.status;
      }
      return null;
  };

  const getButtonStyle = (type: string) => {
     const status = getButtonStatus(type);
     
     if (status === AlertStatus.ACTIVE) {
         return 'bg-red-500 text-white border-red-600';
     }
     if (status === AlertStatus.WORKING) {
         return 'bg-amber-400 text-amber-900 border-amber-500';
     }

     return 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-100 border-slate-300 dark:border-slate-600 hover:border-primary-400 dark:hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-slate-600';
  };

  const handleCreateAlert = async (type: string) => {
    if (!selectedPressId) return;
    
    const existingStatus = getButtonStatus(type);
    if (existingStatus) return; 

    setFeedbackMessage(null);
    const result = await createAlert(type, selectedPressId, `Reporte rápido de ${type}`, 'Operador de Prensa');
    if (result) {
      setFeedbackMessage({type: 'success', text: `Reportado: ${type}`});
    } else {
      setFeedbackMessage({type: 'error', text: `Error al reportar: ${type}`});
    }
    scheduleFeedbackClear(2500);
  };
  
  // SOS: hold 1s to trigger (fast but deliberate), broadcast to every panel
  const SOS_HOLD_MS = 1000;

  const triggerSos = async () => {
    if (!selectedPressId || sosActiveOnPress) return;
    const result = await createAlert(SOS_ALERT_TYPE, selectedPressId, '¡EMERGENCIA! Requiere atención inmediata', 'Operador de Prensa');
    setFeedbackMessage(result
      ? { type: 'success', text: '¡SOS ACTIVADO! Todos los paneles notificados' }
      : { type: 'error', text: 'Error al activar el SOS' });
    scheduleFeedbackClear(3000);
  };

  const handleSosHoldStart = () => {
    if (sosActiveOnPress) return;
    setIsHoldingSos(true);
    sosHoldTimerRef.current = window.setTimeout(() => {
      sosHoldTimerRef.current = null;
      setIsHoldingSos(false);
      triggerSos();
    }, SOS_HOLD_MS);
  };

  const handleSosHoldEnd = () => {
    const wasPending = sosHoldTimerRef.current !== null;
    if (wasPending) {
      window.clearTimeout(sosHoldTimerRef.current);
      sosHoldTimerRef.current = null;
      // Released before 1s: teach the gesture instead of failing silently
      setFeedbackMessage({ type: 'error', text: 'Mantén presionado 1 segundo para activar el SOS' });
      scheduleFeedbackClear(2500);
    }
    setIsHoldingSos(false);
  };

  const handleCancelAlert = async (alertId: string) => {
    const result = await updateAlertStatus(alertId, AlertStatus.CANCELLED, 'Cancelada por el operador');
    if (result) {
      setFeedbackMessage({type: 'success', text: 'Alerta cancelada'});
    } else {
      setFeedbackMessage({type: 'error', text: 'Error al cancelar'});
    }
    scheduleFeedbackClear(2500);
  };

  // --- VIEW 1: SELECTOR ---
  if (!selectedPressId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-100 dark:bg-slate-900">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-md w-full max-w-md text-center border border-slate-200 dark:border-slate-700">
            <div className="flex justify-center mb-5">
                 <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-lg flex items-center justify-center border border-rose-200 dark:border-rose-800">
                    <PressMachineIcon className="w-10 h-10" />
                 </div>
            </div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-1.5">Acceso de Operador</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Selecciona tu máquina para continuar.</p>
            <PressSelector selectedItem={selectedPressId} onSelectItem={setSelectedPressId} label="" />
             <button onClick={() => navigate('/')} className="mt-6 text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 font-medium text-sm transition-colors">
                ← Volver al inicio
            </button>
        </div>
      </div>
    );
  }

  // --- VIEW 2: DASHBOARD ---
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 p-4 md:p-6">
      
      <PanelHeader
        icon={<PressMachineIcon className="w-7 h-7" />}
        iconClassName="bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400"
        title={selectedPress?.name || ''}
        subtitle="Panel de operador"
      >
        <button onClick={() => setSelectedPressId(null)} className="px-4 h-10 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md font-semibold text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
            Cambiar Prensa
        </button>
      </PanelHeader>

      {/* Feedback Toast */}
      {feedbackMessage && (
        <div className={`fixed top-5 left-1/2 transform -translate-x-1/2 px-5 py-3 rounded-lg shadow-lg z-50 flex items-center gap-2.5 animate-slide-in border
          ${feedbackMessage.type === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-900/90 border-emerald-200 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200' 
            : 'bg-red-50 dark:bg-red-900/90 border-red-200 dark:border-red-700 text-red-800 dark:text-red-200'}`}>
             <div className={`w-2.5 h-2.5 rounded-full ${feedbackMessage.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
             <span className="font-semibold">{feedbackMessage.text}</span>
        </div>
      )}

      {(loadingConfigs || loadingAlerts) ? <LoadingSpinner message="Cargando..." /> : (
        <div className="space-y-5">
        {/* SOS EMERGENCY BUTTON */}
        <button
            onPointerDown={handleSosHoldStart}
            onPointerUp={handleSosHoldEnd}
            onPointerLeave={handleSosHoldEnd}
            onPointerCancel={handleSosHoldEnd}
            onContextMenu={(e) => e.preventDefault()}
            disabled={sosActiveOnPress}
            style={{ touchAction: 'none' }}
            className={`
                relative w-full overflow-hidden rounded-lg border-2 py-5 select-none
                flex flex-col items-center justify-center gap-1 transition-all
                ${sosActiveOnPress
                    ? 'bg-red-800 border-red-900 text-white cursor-not-allowed animate-pulse'
                    : 'bg-red-600 border-red-700 text-white hover:bg-red-500 active:scale-[0.99] cursor-pointer'}
            `}
        >
            {isHoldingSos && (
                <div className="absolute bottom-0 left-0 h-2 bg-white animate-hold-progress" style={{ animationDuration: `${SOS_HOLD_MS}ms` }} />
            )}
            <span className="text-3xl font-extrabold uppercase tracking-widest">
                {sosActiveOnPress ? '🚨 SOS Activo' : '🚨 SOS'}
            </span>
            <span className="text-xs font-semibold uppercase tracking-wide opacity-80">
                {sosActiveOnPress ? 'Emergencia reportada — todos los paneles notificados' : 'Mantener presionado 1 segundo para alertar a toda la planta'}
            </span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            
            {/* ALERT BUTTONS */}
            <section className="lg:col-span-2 bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                    <ExclamationTriangleIcon className="w-5 h-5 text-amber-500" />
                    Reportar Problema
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {alertButtons.map(btn => {
                        const status = getButtonStatus(btn.name);
                        return (
                            <button
                                key={btn.id}
                                onClick={() => handleCreateAlert(btn.name)}
                                disabled={!!status}
                                className={`
                                    relative flex flex-col items-center justify-center gap-2 p-5 rounded-lg border-2 transition-all
                                    active:scale-[0.98] disabled:cursor-not-allowed
                                    ${getButtonStyle(btn.name)}
                                `}
                                style={{ minHeight: '130px' }}
                            >
                                {getIconForType(btn.id || btn.name)}
                                <span className="font-semibold text-sm uppercase tracking-wide text-center leading-tight">{btn.name}</span>
                                {status && (
                                  <span className="absolute top-2 right-2 text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-black/20 text-white">
                                    {status === AlertStatus.ACTIVE ? 'Activa' : 'En proceso'}
                                  </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </section>

            {/* ACTIVE ALERTS */}
            <section className="lg:col-span-1 bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col h-full min-h-[350px]">
                <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                    <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
                    Alertas Activas
                </h2>
                
                <div className="flex-1 space-y-3 overflow-y-auto">
                    {activeAlertsOnPress.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800 p-6">
                            <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-800 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-3">
                                <PressMachineIcon className="w-8 h-8" />
                            </div>
                            <p className="text-base font-semibold text-emerald-800 dark:text-emerald-200">Todo en orden</p>
                            <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-0.5">Sistema operativo</p>
                        </div>
                    ) : (
                        activeAlertsOnPress.map(alert => (
                            <div key={alert.id} className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 dark:border-red-600 p-4 rounded-lg">
                                <div className="flex justify-between items-start mb-1.5">
                                     <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100 leading-tight">{alert.type}</h3>
                                     <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${alert.status === AlertStatus.WORKING ? 'bg-amber-200 dark:bg-amber-700 text-amber-800 dark:text-amber-100' : 'bg-red-200 dark:bg-red-700 text-red-800 dark:text-red-100'}`}>
                                        {alert.status === AlertStatus.WORKING ? 'En proceso' : 'Activa'}
                                     </span>
                                </div>
                                <div className="text-slate-500 dark:text-slate-400 text-xs mb-3">{new Date(alert.timestamp).toLocaleTimeString()}</div>
                                {alert.type === SOS_ALERT_TYPE ? (
                                    <div className="w-full py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-red-600 dark:text-red-300 border border-red-300 dark:border-red-600 rounded-md">
                                        Solo supervisor puede gestionar el SOS
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => handleCancelAlert(alert.id)}
                                        className="w-full py-2.5 bg-white dark:bg-slate-700 border border-red-300 dark:border-red-600 text-red-600 dark:text-red-300 font-semibold text-sm rounded-md hover:bg-red-500 hover:text-white hover:border-red-500 transition-colors"
                                    >
                                        Cancelar Alerta
                                    </button>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </section>
        </div>
        </div>
      )}
    </div>
  );
};

export default PressDashboard;