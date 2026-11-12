import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User } from '../types';
import { AUTH_EXPIRED_EVENT } from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password_val: string) => Promise<User | null>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// URL del backend — en dev el proxy de Vite lo redirige automáticamente
const BACKEND_URL = import.meta.env.VITE_API_URL || '';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const clearSession = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  // Al arrancar: el token se valida contra el backend. Nunca se confía en
  // el objeto `user` de localStorage (era editable y permitía abrir /admin).
  useEffect(() => {
    let cancelled = false;

    const restoreSession = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        if (!cancelled) { setUser(null); setLoading(false); }
        return;
      }

      try {
        const response = await fetch(`${BACKEND_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Sesión inválida');
        const data = await response.json();
        if (cancelled) return;
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
      } catch {
        if (cancelled) return;
        clearSession();
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    restoreSession();

    const handleAuthExpired = () => setUser(null);
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'token' && !event.newValue) setUser(null);
    };

    window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    window.addEventListener('storage', handleStorage);
    return () => {
      cancelled = true;
      window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
      window.removeEventListener('storage', handleStorage);
    };
  }, [clearSession]);

  const login = useCallback(async (username: string, password_val: string): Promise<User | null> => {
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password: password_val }),
      });

      if (response.status === 401) {
        // Credenciales inválidas: no es un error de red.
        return null;
      }

      if (!response.ok) {
        const err = await response.json().catch(() => ({} as any));
        throw new Error(err.message || `No se pudo iniciar sesión (${response.status})`);
      }

      const { token, user: loggedUser } = await response.json();
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(loggedUser));
      setUser(loggedUser);
      return loggedUser;
    } catch (err: any) {
      // Se propaga para que LoginPage distinga red/servidor de credenciales.
      throw new Error(err?.message || 'No se pudo conectar con el servidor');
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
