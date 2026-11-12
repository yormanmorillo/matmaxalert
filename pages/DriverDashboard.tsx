import React, { useState, useMemo } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { useAlerts } from '../hooks/useAlerts';
import { useAlertConfig } from '../hooks/useAlertConfig';
import { usePresses } from '../hooks/usePresses';
import { AlertStatus, SOS_ALERT_TYPE, User } from '../types';
import AlertCard from '../components/AlertCard';
import LoadingSpinner from '../components/LoadingSpinner';
import PanelHeader from '../components/PanelHeader';
import UserSelectorScreen from '../components/UserSelectorScreen';
import PressStatusGrid from '../components/PressStatusGrid';
import { ForkliftIcon, BellIcon, BellSlashIcon } from '../constants';
import { useNotifications } from '../hooks/useNotifications';

type Tab = 'list' | 'grid';

const DriverDashboard: React.FC = () => {
  const { alerts, loadingAlerts, refreshAlerts } = useAlerts();
  const { presses, loadingPresses } = usePresses();
  const { buttonConfigs, loadingConfigs } = useAlertConfig();
  
  const [selectedDriver, setSelectedDriver] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('list');

  const assignedPressIds = useMemo(() => new Set(selectedDriver?.assignedPressIds || []), [selectedDriver]);
  const assignedPresses = useMemo(() => {
    if (assignedPressIds.size === 0) return [];
    return presses.filter(p => assignedPressIds.has(p.id));
  }, [presses, assignedPressIds]);
  
  // El driver ve todo lo abierto de sus prensas (SOS siempre), aunque el tipo
  // se haya desactivado después de crear la alerta.
  const relevantAlerts = useMemo(() => alerts.filter(
      alert =>
          (alert.type === SOS_ALERT_TYPE || assignedPressIds.has(alert.pressId)) &&
          (alert.status === AlertStatus.ACTIVE || alert.status === AlertStatus.WORKING)
  ).sort((a, b) => a.timestamp - b.timestamp), [alerts, assignedPressIds]);

  const { isMuted, toggleMute } = useNotifications(relevantAlerts, 'sound');

  if (!selectedDriver) {
    return (
      <UserSelectorScreen
        role='driver'
        onUserSelect={setSelectedDriver}
        title="Portal de Montacarguista"
        icon={<ForkliftIcon className="w-10 h-10" />}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 p-4 md:p-6">
      <PanelHeader
        icon={<ForkliftIcon className="w-7 h-7" />}
        iconClassName="bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
        title="Panel de Logística"
        subtitle={`Hola, ${selectedDriver.username}`}
      >
             <button
                onClick={toggleMute}
                className="w-10 h-10 flex items-center justify-center rounded-md border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                title={isMuted ? 'Activar sonido' : 'Silenciar'}
            >
                {isMuted ? <BellSlashIcon className="w-5 h-5"/> : <BellIcon className="w-5 h-5 text-primary-500"/>}
            </button>
            <button
                onClick={refreshAlerts}
                className="px-4 h-10 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md font-semibold text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
                Actualizar
            </button>
             <button
                onClick={() => setSelectedDriver(null)}
                className="px-4 h-10 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md font-semibold text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
            >
                Salir
            </button>
      </PanelHeader>

      {/* Tabs */}
      <div className="flex mb-5">
          <div className="bg-white dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 inline-flex gap-1">
              <button
                onClick={() => setActiveTab('list')}
                className={`px-5 py-2 rounded-md text-sm font-semibold transition-colors ${activeTab === 'list' ? 'bg-primary-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
              >
                  Solicitudes
              </button>
              <button
                onClick={() => setActiveTab('grid')}
                className={`px-5 py-2 rounded-md text-sm font-semibold transition-colors ${activeTab === 'grid' ? 'bg-primary-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
              >
                  Mi Zona
              </button>
          </div>
      </div>
      
      {assignedPressIds.size === 0 && (
           <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3.5 rounded-lg text-amber-800 dark:text-amber-200 text-sm font-medium mb-5">
                No tienes prensas asignadas. Contacta a un supervisor.
           </div>
      )}

      {activeTab === 'list' && (
        <div>
            {(loadingAlerts || loadingConfigs || loadingPresses) && <LoadingSpinner message="Verificando solicitudes..." />}

            {!loadingAlerts && !loadingConfigs && relevantAlerts.length === 0 && (
                 <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    <ForkliftIcon className="w-14 h-14 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                    <h2 className="text-lg font-semibold text-slate-600 dark:text-slate-300">Sin solicitudes de material</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Tu zona asignada está abastecida.</p>
                 </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {relevantAlerts.map(alert => (
                    <AlertCard key={alert.id} alert={alert} actor={selectedDriver} />
                ))}
            </div>
        </div>
      )}

      {activeTab === 'grid' && (
           <div className="bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700">
                <PressStatusGrid actor={selectedDriver} pressesToShow={assignedPresses} />
           </div>
      )}
    </div>
  );
};

export default DriverDashboard;