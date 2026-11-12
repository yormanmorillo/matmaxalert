import { Shift } from '../types';
import { apiFetch, normalizeIds, normalizeId } from './api';

export const getShifts = async (): Promise<Shift[]> => {
    const data = await apiFetch('/shifts');
    return normalizeIds(data);
};

export const addShift = async (shiftData: Omit<Shift, 'id'>): Promise<Shift | null> => {
    return apiFetch('/shifts', {
        method: 'POST',
        body: JSON.stringify(shiftData),
    });
};

export const updateShift = async (shiftId: string, updates: Partial<Shift>): Promise<Shift | null> => {
    return apiFetch(`/shifts/${shiftId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
    });
};

export const deleteShift = async (shiftId: string): Promise<boolean> => {
    try {
        await apiFetch(`/shifts/${shiftId}`, {
            method: 'DELETE',
        });
        return true;
    } catch (error) {
        console.error("Error deleting shift:", error);
        return false;
    }
};
