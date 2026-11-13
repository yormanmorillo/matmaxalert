import { Alert } from '../types';
import { apiFetch, normalizeIds, normalizeId } from './api';

// El backend ahora devuelve { alerts, total }
interface AlertsResponse {
  alerts: Alert[];
  total: number;
}

export const getAlerts = async (params?: { limit?: number; status?: string; startDate?: number; endDate?: number; includeActive?: boolean }): Promise<Alert[]> => {
  const query = new URLSearchParams();
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.status) query.set('status', params.status);
  if (params?.startDate) query.set('startDate', String(params.startDate));
  if (params?.endDate) query.set('endDate', String(params.endDate));
  if (params?.includeActive) query.set('includeActive', 'true');
  const qs = query.toString();

  const data: AlertsResponse = await apiFetch(`/alerts${qs ? `?${qs}` : ''}`);
  return normalizeIds(data.alerts || []);
};

export const createAlert = async (alertData: Partial<Alert>): Promise<Alert | null> => {
  return apiFetch('/alerts', {
    method: 'POST',
    body: JSON.stringify(alertData),
  });
};

export const updateAlert = async (alertId: string, updates: Partial<Alert>): Promise<Alert | null> => {
  return apiFetch(`/alerts/${alertId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
};