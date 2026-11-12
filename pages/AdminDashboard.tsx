import React, { useMemo } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { useAlerts } from '../hooks/useAlerts';
import { useAlertConfig } from '../hooks/useAlertConfig';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/LoadingSpinner';
import UserManagementTable from '../components/UserManagementTable';
import PressManagementTable from '../components/PressManagementTable';
import AlertConfigForm from '../components/AlertConfigForm';
import ShiftManagementTable from '../components/ShiftManagementTable';
import RoleManagementTable from '../components/RoleManagementTable';
import DriverPressAssignmentTable from '../components/DriverPressAssignmentTable';
import AreaManagementTable from '../components/AreaManagementTable';
import ReportsTab from '../components/ReportsTab';
import SupervisorPermissionsTable from '../components/SupervisorPermissionsTable';
import ThemeToggleButton from '../components/ThemeToggleButton';
import { HomeIcon, ChartBarIcon, ListBulletIcon, UserGroupIcon, CogIcon, ClockIcon, ExclamationTriangleIcon, WrenchScrewdriverIcon, CheckBadgeIcon, CalendarDaysIcon, ShieldCheckIcon, ClipboardDocumentListIcon, MapPinIcon, DocumentChartBarIcon, KeyIcon, BuildingStorefrontIcon } from '../constants';
import { AlertStatus } from '../types';

const { Link, useLocation, useNavigate } = ReactRouterDOM;

const StatCard: React.FC<{ icon: React.ReactNode; title: string; value: string; color: string }> = ({ icon, title, value, color }) => (
    <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
            {icon}
        </div>
        <div className="min-w-0">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">{title}</p>
            <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{value}</p>
        </div>
    </div>
);

const BarChart: React.FC<{ data: { label: string; value: number; color: string }[], title: string }> = ({ data, title }) => {
    const maxValue = Math.max(...data.map(d => d.value), 1);
    return (
        <div className="bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700">
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-4">{title}</h3>
            <div className="space-y-3">
                {data.map((item, index) => (
                    <div key={index} className="flex items-center">
                        <span className="text-sm text-slate-600 dark:text-slate-400 w-24 truncate" title={item.label}>{item.label}</span>
                        <div className="flex-1 bg-slate-100 dark:bg-slate-700 rounded h-6 mr-2">
                            <div
                                className={`${item.color} h-full rounded flex items-center justify-end pr-2 text-white font-semibold text-xs`}
                                style={{ width: `${(item.value / maxValue) * 100}%` }}
                            >
                                {item.value > 0 ? item.value : ''}
                            </div>
                        </div>
                    </div>
                ))}
                {data.reduce((sum, item) => sum + item.value, 0) === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">Sin datos para mostrar.</p>}
            </div>
        </div>
    );
};

const PieChart: React.FC<{ data: { label: string; value: number; colorClass: string; colorHex: string }[], title: string }> = ({ data, title }) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);

    if (total === 0) {
        return (
             <div className="bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700">
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-4">{title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Sin datos para mostrar.</p>
            </div>
        );
    }
    
    let cumulativePercent = 0;
    const gradients = data.filter(item => item.value > 0).map(item => {
        const percent = (item.value / total) * 100;
        const start = cumulativePercent;
        cumulativePercent += percent;
        const end = cumulativePercent;
        return `${item.colorHex} ${start}% ${end}%`;
    }).join(', ');

    return (
        <div className="bg-white dark:bg-slate-800 p-5 rounded-lg border border-slate-200 dark:border-slate-700">
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-4">{title}</h3>
            <div className="flex flex-col sm:flex-row items-center gap-5">
                <div 
                    className="w-32 h-32 rounded-full flex-shrink-0"
                    style={{ background: `conic-gradient(${gradients})`}}
                    role="img"
                    aria-label={`Pie chart of ${title}`}
                ></div>
                <div className="space-y-2 w-full sm:w-auto">
                    {data.filter(item => item.value > 0).map((item, index) => (
                        <div key={index} className="flex items-center">
                            <span className={`w-3 h-3 rounded-sm mr-2 ${item.colorClass}`}></span>
                            <span className="text-sm text-slate-700 dark:text-slate-300 truncate">{item.label}: {item.value} ({((item.value / total) * 100).toFixed(1)}%)</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

type AdminSection = 'dashboard' | 'users' | 'presses' | 'alertConfig' | 'shifts' | 'roles' | 'driverPressAssignment' | 'areas' | 'reports' | 'permissions';

const AdminDashboard: React.FC = () => {
  const { alerts, loadingAlerts, refreshAlerts } = useAlerts();
  const { buttonConfigs, loadingConfigs } = useAlertConfig();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const activeSection = useMemo((): AdminSection => {
    const hash = location.hash.replace('#', '');
    switch (hash) {
      case 'user-management': return 'users';
      case 'press-management': return 'presses';
      case 'alert-config': return 'alertConfig';
      case 'shift-management': return 'shifts';
      case 'role-management': return 'roles';
      case 'driver-press-assignment': return 'driverPressAssignment';
      case 'area-management': return 'areas';
      case 'reports': return 'reports';
      case 'permissions': return 'permissions';
      default: return 'dashboard';
    }
  }, [location.hash]);

  const dashboardStats = useMemo(() => {
    if (!alerts || !buttonConfigs) {
        return {
            activeCount: 0, workingCount: 0, resolvedTodayCount: 0,
            avgResolutionTime: 'N/A', alertsByType: [], alertsByStatus: []
        };
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const activeCount = alerts.filter(a => a.status === AlertStatus.ACTIVE).length;
    const workingCount = alerts.filter(a => a.status === AlertStatus.WORKING).length;
    
    const resolvedAlerts = alerts.filter(a => a.status === AlertStatus.RESOLVED && a.resolvedTimestamp);
    const resolvedTodayCount = resolvedAlerts.filter(a => a.resolvedTimestamp! >= todayStart).length;

    let avgResolutionTime = 'N/A';
    if (resolvedAlerts.length > 0) {
        const totalResolutionTime = resolvedAlerts.reduce((sum, a) => sum + (a.resolvedTimestamp! - a.timestamp), 0);
        const avgMillis = totalResolutionTime / resolvedAlerts.length;
        const hours = Math.floor(avgMillis / 3600000);
        const minutes = Math.floor((avgMillis % 3600000) / 60000);
        avgResolutionTime = `${hours}h ${minutes}m`;
    }

    const chartColors = ['bg-sky-500', 'bg-amber-500', 'bg-indigo-500', 'bg-emerald-500', 'bg-slate-500', 'bg-rose-500', 'bg-lime-500'];
    const alertsByType = buttonConfigs.map((config, index): { label: string; value: number; color: string } => ({
        label: config.name,
        value: alerts.filter(a => a.type === config.name).length,
        color: chartColors[index % chartColors.length]
    }));
    
    const statusToColor: Record<AlertStatus, { bg: string, hex: string }> = {
      [AlertStatus.ACTIVE]: { bg: 'bg-status_active', hex: '#F43F5E' },
      [AlertStatus.WORKING]: { bg: 'bg-status_working', hex: '#F97316' },
      [AlertStatus.RESOLVED]: { bg: 'bg-status_resolved', hex: '#14B8A6' },
      [AlertStatus.CANCELLED]: { bg: 'bg-status_cancelled', hex: '#94A3B8' },
    };

    const alertsByStatus = Object.values(AlertStatus).map(status => ({
        label: status,
        value: alerts.filter(a => a.status === status).length,
        colorClass: statusToColor[status].bg,
        colorHex: statusToColor[status].hex,
    }));

    return { activeCount, workingCount, resolvedTodayCount, avgResolutionTime, alertsByType, alertsByStatus };
  }, [alerts, buttonConfigs]);

  const renderSection = () => {
    switch (activeSection) {
      case 'users':
        return <UserManagementTable />;
      case 'roles':
        return <RoleManagementTable />;
      case 'presses':
        return <PressManagementTable showExtendedAdminControls={true} />;
      case 'shifts':
        return <ShiftManagementTable />;
      case 'areas':
        return <AreaManagementTable />;
      case 'alertConfig':
        return <AlertConfigForm />;
      case 'driverPressAssignment':
        return <DriverPressAssignmentTable />;
      case 'reports':
        return <ReportsTab />;
      case 'permissions':
        return <SupervisorPermissionsTable />;
      case 'dashboard':
      default:
        if (loadingAlerts || loadingConfigs) return <LoadingSpinner message="Calculando métricas..." />;
        return (
          <div className="space-y-5">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard icon={<ExclamationTriangleIcon className="w-5 h-5 text-white"/>} title="Alertas Activas" value={dashboardStats.activeCount.toString()} color="bg-status_active" />
                  <StatCard icon={<WrenchScrewdriverIcon className="w-5 h-5 text-white"/>} title="En Proceso" value={dashboardStats.workingCount.toString()} color="bg-status_working" />
                  <StatCard icon={<CheckBadgeIcon className="w-5 h-5 text-white"/>} title="Resueltas Hoy" value={dashboardStats.resolvedTodayCount.toString()} color="bg-status_resolved" />
                  <StatCard icon={<ClockIcon className="w-5 h-5 text-white"/>} title="Tiempo Promedio" value={dashboardStats.avgResolutionTime} color="bg-primary-600" />
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <BarChart data={dashboardStats.alertsByType} title="Alertas por Tipo (Total)" />
                  <PieChart data={dashboardStats.alertsByStatus} title="Distribución por Estado" />
              </div>
          </div>
        );
    }
  };
  
  const SectionLink: React.FC<{section: AdminSection, label: string, icon: React.ReactNode}> = ({section, label, icon}) => {
    const path = {
        dashboard: '/admin',
        users: '/admin#user-management',
        roles: '/admin#role-management',
        presses: '/admin#press-management',
        areas: '/admin#area-management',
        shifts: '/admin#shift-management',
        alertConfig: '/admin#alert-config',
        driverPressAssignment: '/admin#driver-press-assignment',
        permissions: '/admin#permissions',
        reports: '/admin#reports',
    }[section];

    return (
        <Link
            to={path}
            className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap
                ${activeSection === section 
                    ? 'bg-primary-600 text-white' 
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
        >
            {icon}
            <span>{label}</span>
        </Link>
    );
  };

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* Header */}
      <header className="mb-5 flex-shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
                <Link to="/admin" className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors" title="Panel de administración">
                    <HomeIcon className="w-6 h-6"/>
                </Link>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Administración</h1>
            </div>
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 self-start sm:self-auto">
                <ThemeToggleButton className="bg-transparent" />
                <div className="h-5 w-px bg-slate-200 dark:bg-slate-600"></div>
                <Link
                    to="/"
                    className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                    title="Panel principal"
                >
                    <BuildingStorefrontIcon className="w-5 h-5" />
                </Link>
                <button
                    onClick={refreshAlerts}
                    className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                    title="Actualizar"
                    disabled={loadingAlerts}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={`w-5 h-5 ${loadingAlerts ? 'animate-spin' : ''}`}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                    </svg>
                </button>
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
        <nav className="flex gap-1 mt-4 overflow-x-auto pb-1 -mx-1 px-1">
            <SectionLink section="dashboard" label="Métricas" icon={<ChartBarIcon className="w-4 h-4"/>} />
            <SectionLink section="users" label="Usuarios" icon={<UserGroupIcon className="w-4 h-4"/>} />
            <SectionLink section="roles" label="Roles" icon={<ShieldCheckIcon className="w-4 h-4"/>} />
            <SectionLink section="shifts" label="Turnos" icon={<CalendarDaysIcon className="w-4 h-4"/>} />
            <SectionLink section="areas" label="Áreas" icon={<MapPinIcon className="w-4 h-4"/>} />
            <SectionLink section="presses" label="Prensas" icon={<CogIcon className="w-4 h-4"/>} />
            <SectionLink section="alertConfig" label="Alertas" icon={<ListBulletIcon className="w-4 h-4"/>} />
            <SectionLink section="driverPressAssignment" label="Asignación" icon={<ClipboardDocumentListIcon className="w-4 h-4"/>} />
            <SectionLink section="permissions" label="Permisos" icon={<KeyIcon className="w-4 h-4"/>} />
            <SectionLink section="reports" label="Reportes" icon={<DocumentChartBarIcon className="w-4 h-4"/>} />
        </nav>
      </header>

      <main className="flex-1 min-h-0 overflow-y-auto">
        {renderSection()}
      </main>
    </div>
  );
};

export default AdminDashboard;