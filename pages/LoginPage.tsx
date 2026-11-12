import React, { useState, useEffect, useMemo } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useRoles } from '../hooks/useRoles';
import { AmsLogoIcon } from '../constants';
import ThemeToggleButton from '../components/ThemeToggleButton';

const { useNavigate, useLocation } = ReactRouterDOM;

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [targetRole, setTargetRole] = useState<string | null>(null);
  
  const { login, loading, logout } = useAuth();
  const { roles } = useRoles();
  const navigate = useNavigate();
  const location = useLocation();

  const rolesMap = useMemo(() => new Map(roles.map(r => [r.id, r.displayName])), [roles]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const roleParam = params.get('role');
    if (roleParam) {
      setTargetRole(roleParam);
    }
  }, [location.search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!username) {
        setError("El usuario es requerido.");
        return;
    }
    try {
      const authenticatedUser = await login(username, password);

      if (!authenticatedUser) {
        setError('Credenciales inválidas. Verifica tu usuario y contraseña.');
        return;
      }

      if (targetRole && authenticatedUser.role !== targetRole) {
        setError(`Acceso denegado. El usuario no tiene el rol de ${rolesMap.get(targetRole) || targetRole}.`);
        logout();
        return;
      }

      const fallback = ['admin', 'supervisor'].includes(authenticatedUser.role)
        ? `/${authenticatedUser.role}`
        : '/';
      const requested = location.state?.from?.pathname as string | undefined;
      const requestedIsOwnPortal = requested
        && (authenticatedUser.role === 'admin'
          ? requested.startsWith('/admin')
          : authenticatedUser.role === 'supervisor'
            ? requested.startsWith('/supervisor')
            : false);

      navigate(requestedIsOwnPortal ? requested! : fallback, { replace: true });
    } catch (err: any) {
      setError(err?.message || 'No se pudo conectar con el servidor. Intenta de nuevo.');
    }
  };

  const targetRoleDisplayName = targetRole ? rolesMap.get(targetRole) : null;

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900 p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggleButton className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700" />
      </div>
      
      <div className="bg-white dark:bg-slate-800 p-8 rounded-lg border border-slate-200 dark:border-slate-700 w-full max-w-md shadow-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 mx-auto mb-4 text-slate-700 dark:text-slate-200">
             <AmsLogoIcon className="w-full h-full" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Iniciar Sesión</h1>
          {targetRoleDisplayName && (
            <span className="inline-block mt-2 px-3 py-1 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-sm font-semibold rounded-md">
              Portal {targetRoleDisplayName}
            </span>
          )}
           <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Ingresa tus credenciales para continuar.</p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 p-3 rounded-md mb-5 text-sm font-medium border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="username" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Usuario
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
              placeholder="ej. admin"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Contraseña
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2.5 px-4 rounded-md transition-colors disabled:opacity-60"
          >
            {loading ? 'Verificando...' : 'Entrar'}
          </button>
        </form>
         <button onClick={() => navigate('/')} className="w-full mt-5 text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 font-medium text-sm transition-colors">
            ← Volver a la selección
        </button>
      </div>
    </div>
  );
};

export default LoginPage;