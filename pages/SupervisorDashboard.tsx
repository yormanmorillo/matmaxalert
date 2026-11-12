import React, { useMemo } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { useAlerts } from '../hooks/useAlerts';
import { useAlertConfig } from '../hooks/useAlertConfig';
import { useAuth } from '../hooks/useAuth';
import AlertCard from '../components/AlertCard';
import { AlertStatus, SOS_ALERT_TYPE } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import PressStatusGrid from '../components/PressStatusGrid';
import { useNotifications } from '../hooks/useNotifications';
import ThemeToggleButton from '../components/ThemeToggleButton';
import { ListBulletIcon, EyeIcon, ShieldCheckIcon, BellIcon, BellSlashIcon, BuildingStorefrontIcon } from '../constants';
import UserManagementTable from '../components/UserManagementTable';
import PressManagementTable from '../components/PressManagementTable';
import ReportsTab from '../components/ReportsTab';
import AreaManagementTable from '../components/AreaManagementTable';
import DriverPressAssignmentTable from '../components/DriverPressAssignmentTable';
import AlertConfigForm from '../components/AlertConfigForm';
import ShiftManagementTable from '../components/ShiftManagementTable';
import RoleManagementTable from '../components/RoleManagementTable';

const { Link, useLocation, useNavigate } = ReactRouterDOM;

type SupervisorSection = 'alerts' | 'grid' | 'users' | 'presses' | 'alertConfig' | 'shifts' | 'roles' | 'driverPressAssignment' | 'areas' | 'reports';

const SupervisorDashboard: React.FC = () => {
  const { loadingAlerts, getActiveAlerts, refreshAlerts, alerts } = useAlerts();
  const { buttonConfigs, loadingConfigs } = useAlertConfig();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const activeSection = useMemo((): SupervisorSection => {
    const hash = location.hash.replace('#', '');
    if (hash === 'grid') return 'grid';
    if (user?.allowedSections?.includes(hash)) {
        return hash as SupervisorSection;
    }
    return 'alerts';
  }, [location.hash, user]);

  // Visibilidad: una alerta activa SIEMPRE se muestra, aunque su tipo se haya
  // desactivado o se le haya quitado el rol. La configuración limita crear,
  // no atender lo que ya está abierto.
  const activeAlerts = useMemo(() => getActiveAlerts()
    .sort((a,b) => a.timestamp - b.timestamp), [getActiveAlerts]);

  const activeCount = activeAlerts.filter(a => a.status === 'ACTIVE').length;

  const relevantAlertsForNotification = useMemo(
    () => alerts.filter(alert => alert.status === AlertStatus.ACTIVE || alert.status === AlertStatus.WORKING),
    [alerts]
  );
  const { isMuted, toggleMute } = useNotifications(relevantAlertsForNotification, 'sound');

  const adminSections: Record<string, { label: string, component: React.ReactNode }> = {
    'users': { label: 'User Management', component: <UserManagementTable /> },
    'roles': { label: 'Role Management', component: <RoleManagementTable /> },
    'shifts': { label: 'Shift Management', component: <ShiftManagementTable /> },
    'areas': { label: 'Area Management', component: <AreaManagementTable /> },
    'presses': { label: 'Press Management', component: <PressManagementTable showExtendedAdminControls={false} /> },
    'alertConfig': { label: 'Alert Config', component: <AlertConfigForm /> },
    'driverPressAssignment': { label: 'Assignments', component: <DriverPressAssignmentTable /> },
    'reports': { label: 'Reports', component: <ReportsTab /> },
  };

  const renderSection = () => {
    switch(activeSection) {
        case 'alerts':
            return (loadingAlerts || loadingConfigs) ? <LoadingSpinner message="Cargando..." /> : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {activeAlerts.length === 0 ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-16 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                        <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-4">
                            <ShieldCheckIcon className="w-7 h-7" />
                        </div>
                        <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">Sin alertas activas</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Todos los sistemas operan con normalidad.</p>
                    </div>
                    ) : (
                    activeAlerts.map(alert => <AlertCard key={alert.id} alert={alert} actor={user} />)
                    )}
                </div>
            );
        case 'grid':
            return <PressStatusGrid actor={user} />;
        default:
            return adminSections[activeSection]?.component || <div>Sección no encontrada</div>;
    }
  }

  const getSectionTitle = () => {
      if (activeSection === 'alerts') return 'Alertas';
      if (activeSection === 'grid') return 'Mapa de Planta';
      return adminSections[activeSection]?.label || 'Panel';
  }

  const NavTab: React.FC<{ to: string; active: boolean; icon: React.ReactNode; label: string }> = ({ to, active, icon, label }) => (
    <Link
      to={to}
      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap
        ${active 
          ? 'bg-primary-600 text-white' 
          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
    >
      {icon}
      {label}
    </Link>
  );

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* Header */}
      <header className="mb-5 flex-shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{getSectionTitle()}</h1>
              {activeSection === 'alerts' && activeCount > 0 && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
                  {activeCount} activa{activeCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 self-start sm:self-auto">
            <ThemeToggleButton className="bg-transparent" />
            <button
                onClick={toggleMute}
                className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                title={isMuted ? 'Activar sonido' : 'Silenciar'}
            >
                {isMuted ? <BellSlashIcon className="w-5 h-5"/> : <BellIcon className="w-5 h-5 text-primary-500"/>}
            </button>
            <div className="h-5 w-px bg-slate-200 dark:bg-slate-600"></div>
            <button
                onClick={refreshAlerts}
                className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                title="Actualizar"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-5 h-5 ${loadingAlerts ? 'animate-spin' : ''}`}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
            </button>
            <Link
                to="/"
                className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                title="Panel principal"
            >
                <BuildingStorefrontIcon className="w-5 h-5" />
            </Link>
            <button
                onClick={() => { logout(); navigate('/login'); }}
                className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 dark:text-red-400 transition-colors"
                title="Cerrar sesión"
            >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                </svg>
            </button>
          </div>
        </div>

        {/* Navigation tabs */}
        <nav className="flex gap-2 mt-4 overflow-x-auto pb-1">
          <NavTab to="/supervisor" active={activeSection === 'alerts'} icon={<ListBulletIcon className="w-4 h-4" />} label="Alertas" />
          <NavTab to="/supervisor#grid" active={activeSection === 'grid'} icon={<EyeIcon className="w-4 h-4" />} label="Mapa" />
          {user?.allowedSections?.map(section => (
            <NavTab 
              key={section}
              to={`/supervisor#${section}`}
              active={activeSection === section}
              icon={null}
              label={adminSections[section]?.label || section}
            />
          ))}
        </nav>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {renderSection()}
      </div>
    </div>
  );
};

export default SupervisorDashboard;