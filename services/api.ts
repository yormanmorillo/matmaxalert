// Defensive helper: maps MongoDB _id → id if id is missing
export const normalizeId = <T extends Record<string, any>>(item: T): T => {
  if (item && (item as any)._id && !item.id) {
    return { ...item, id: (item as any)._id };
  }
  return item;
};

export const normalizeIds = <T extends Record<string, any>>(items: T[]): T[] => {
  return Array.isArray(items) ? items.map(normalizeId) : [];
};

// Evento para sincronizar el estado de auth cuando el token expira
export const AUTH_EXPIRED_EVENT = 'auth:expired';

// La URL base de la API.
// En desarrollo el proxy de Vite redirige /api → http://localhost:3000/api
// En producción se puede sobreescribir con la variable VITE_API_URL
const API_URL = (import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api');

const REQUEST_TIMEOUT_MS = 20_000;

const clearSession = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
};

const redirectToLogin = () => {
  if (!window.location.hash.includes('/login')) {
    window.location.hash = '#/login';
  }
};

export const apiFetch = async <T = any>(endpoint: string, options: RequestInit = {}): Promise<T> => {
  const token = localStorage.getItem('token');
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> || {}),
  };

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
      signal: controller.signal,
    });

    // Solo 401 significa sesión inválida/expirada.
    if (response.status === 401) {
      clearSession();
      window.dispatchEvent(new Event(AUTH_EXPIRED_EVENT));
      redirectToLogin();
      throw new Error('Sesión expirada. Vuelve a iniciar sesión.');
    }

    // 403 = autenticado pero sin permiso: NO se cierra la sesión.
    if (response.status === 403) {
      const error = await response.json().catch(() => ({} as any));
      throw new Error(error.message || 'No tienes permisos para realizar esta acción.');
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({} as any));
      throw new Error(error.message || `Error del servidor (${response.status})`);
    }

    if (response.status === 204) return null as T;
    return await response.json() as T;
  } catch (error: any) {
    if (error?.name === 'AbortError') {
      throw new Error('El servidor tardó demasiado en responder. Revisa la conexión.');
    }
    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
};
