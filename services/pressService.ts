import { Press } from '../types';
import { apiFetch, normalizeIds, normalizeId } from './api';

export const getPresses = async (): Promise<Press[]> => {
    const data = await apiFetch('/presses');
    return normalizeIds(data);
};

export const addPress = async (pressData: Omit<Press, 'id'>): Promise<Press | null> => {
    return apiFetch('/presses', {
        method: 'POST',
        body: JSON.stringify(pressData),
    });
};

export const updatePress = async (pressId: string, updates: Partial<Press>): Promise<Press | null> => {
    return apiFetch(`/presses/${pressId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
    });
};

export const deletePress = async (pressId: string): Promise<boolean> => {
    try {
        await apiFetch(`/presses/${pressId}`, {
            method: 'DELETE',
        });
        return true;
    } catch (error) {
        console.error("Error deleting press:", error);
        return false;
    }
};
