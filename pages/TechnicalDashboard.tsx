import React, { useState, useMemo } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { useAlerts } from '../hooks/useAlerts';
import { useAlertConfig } from '../hooks/useAlertConfig';
import { AlertStatus, SOS_ALERT_TYPE, User } from '../types';
import AlertCard from '../components/AlertCard';
import LoadingSpinner from '../components/LoadingSpinner';
import PanelHeader from '../components/PanelHeader';
import UserSelectorScreen from '../components/UserSelectorScreen';
import { WrenchScrewdriverIcon, BellIcon, BellSlashIcon } from '../constants';
import PressStatusGrid from '../components/PressStatusGrid';
import { useNotifications } from '../hooks/useNotifications';

type Tab = 'list' | 'grid';

const TechnicalDashboard: React.FC = () => {
  const navigate = ReactRouterDOM.useNavigate();
  const { alerts, loadingAlerts, refreshAlerts } = useAlerts();
  const { buttonConfigs, loadingConfigs } = useAlertConfig();
  
  const [selectedTechnician, setSelectedTechnician] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('list');

  // Todas las alertas abiertas son visibles, aunque su tipo ya no esté habilitado.
  const relevantAlerts = useMemo(() => alerts
    .filter(alert => alert.status === AlertStatus.ACTIVE || alert.status === AlertStatus.WORKING)
    .sort((a,b) => a.timestamp - b.timestamp), [alerts]);

  const { isMuted, toggleMute } = useNotifications(relevantAlerts, 'sound');

  if (!selectedTechnician) {
    return (
      <UserSelectorScreen 
        role='technical'
        onUserSelect={setSelectedTechnician}
        title="Portal de Técnico"
        icon={<WrenchScrewdriverIcon className="w-10 h-10" />}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 p-4 md:p-6">
      <PanelHeader
        icon={<WrenchScrewdriverIcon className="w-7 h-7" />}
        iconClassName="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400"
        title="Panel de Técnico"
        subtitle={`Hola, ${selectedTechnician.username}`}
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
                onClick={() => setSelectedTechnician(null)}
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
                  Lista de Tareas
              </button>
              <button
                onClick={() => setActiveTab('grid')}
                className={`px-5 py-2 rounded-md text-sm font-semibold transition-colors ${activeTab === 'grid' ? 'bg-primary-600 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
              >
                  Mapa de Planta
              </button>
          </div>
      </div>
      
      {activeTab === 'list' && (
        <div>
            {(loadingAlerts || loadingConfigs) && <LoadingSpinner message="Verificando tareas..." />}

            {!loadingAlerts && !loadingConfigs && relevantAlerts.length === 0 && (
                 <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    <WrenchScrewdriverIcon className="w-14 h-14 mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                    <h2 className="text-lg font-semibold text-slate-600 dark:text-slate-300">Sin tareas pendientes</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Todos los sistemas funcionan correctamente.</p>
                 </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {relevantAlerts.map(alert => (
                    <AlertCard key={alert.id} alert={alert} actor={selectedTechnician} />
                ))}
            </div>
        </div>
      )}

      {activeTab === 'grid' && (
           <div className="bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700">
                <PressStatusGrid actor={selectedTechnician} />
           </div>
      )}
    </div>
  );
};

export default TechnicalDashboard;