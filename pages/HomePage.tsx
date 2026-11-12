import React from 'react';
import RoleSelectionCard from '../components/RoleSelectionCard';
import { useRoles } from '../hooks/useRoles';
import { EyeIcon, WrenchScrewdriverIcon, ShieldCheckIcon, WatchIcon, AmsLogoIcon, AdminIcon, ForkliftIcon, PressMachineIcon } from '../constants';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAlerts } from '../hooks/useAlerts';

const roleIcons: Record<string, React.ReactNode> = {
  admin: <AdminIcon className="w-8 h-8" />,
  supervisor: <EyeIcon className="w-8 h-8" />,
  technical: <WrenchScrewdriverIcon className="w-8 h-8" />,
  driver: <ForkliftIcon className="w-8 h-8" />,
  press: <PressMachineIcon className="w-8 h-8" />,
  default: <ShieldCheckIcon className="w-8 h-8" />
};

const HomePage: React.FC = () => {
  const { roles, loadingRoles } = useRoles();
  const { isConnected, error } = useAlerts();
  const isHealthy = isConnected && !error;

  return (
    <div className="relative min-h-screen flex flex-col items-center p-6 bg-slate-100 dark:bg-slate-900">
      
      <header className="text-center mt-10 mb-12">
        <div className="inline-flex items-center justify-center p-4 bg-slate-800 dark:bg-slate-700 rounded-xl mb-5">
            <div className="text-white">
                <AmsLogoIcon className="w-10 h-10"/>
            </div>
        </div>
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 tracking-tight mb-2">
            Sistema de Alertas
        </h1>
        <p className="text-base text-slate-500 dark:text-slate-400">
          Selecciona tu portal para continuar
        </p>
      </header>

      {loadingRoles ? <LoadingSpinner message="Iniciando sistema..." /> : (
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl w-full px-2 mb-16">
          {roles.map((role) => {
            const path = role.requiresAuth ? `/login?role=${role.id}` : `/${role.id}`;
            const icon = roleIcons[role.id] || roleIcons.default;
            return (
              <RoleSelectionCard
                key={role.id}
                to={path}
                title={role.displayName}
                description={`Portal de ${role.displayName.toLowerCase()}`}
                icon={icon}
                requiresAuth={role.requiresAuth}
              />
            );
          })}
           
           <div className="sm:col-span-2 lg:col-span-3 mt-8">
             <h2 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4 ml-1">Interfaces Wearables</h2>
             <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <RoleSelectionCard
                    key="supervisor-watch"
                    to="/supervisor-watch"
                    title="Supervisor Watch"
                    description="Solo notificaciones."
                    icon={<WatchIcon className="w-6 h-6" />}
                    requiresAuth={true}
                />
                <RoleSelectionCard
                    key="technical-watch"
                    to="/technical-watch"
                    title="Tech Watch"
                    description="Respuesta rápida."
                    icon={<WatchIcon className="w-6 h-6" />}
                    requiresAuth={false}
                />
                <RoleSelectionCard
                    key="driver-watch"
                    to="/driver-watch"
                    title="Driver Watch"
                    description="Vista de material."
                    icon={<WatchIcon className="w-6 h-6" />}
                    requiresAuth={false}
                />
             </div>
           </div>
        </div>
      )}

      <footer className="mt-auto py-5 flex flex-col items-center gap-2">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border ${
            isHealthy
                ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'
        }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isHealthy ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`}></span>
            {isHealthy ? 'Conectado' : 'Sin conexión'}
        </div>
      </footer>
    </div>
  );
};

export default HomePage;