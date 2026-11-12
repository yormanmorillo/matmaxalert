import { Area } from '../types';
import { apiFetch, normalizeIds, normalizeId } from './api';

export const getAreas = async (): Promise<Area[]> => {
    const data = await apiFetch('/areas');
    return normalizeIds(data);
};

export const addArea = async (areaData: Omit<Area, 'id'>): Promise<Area | null> => {
    return apiFetch('/areas', {
        method: 'POST',
        body: JSON.stringify(areaData),
    });
};

export const updateArea = async (areaId: string, updates: Partial<Area>): Promise<Area | null> => {
    return apiFetch(`/areas/${areaId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
    });
};

export const deleteArea = async (areaId: string): Promise<boolean> => {
    try {
        await apiFetch(`/areas/${areaId}`, {
            method: 'DELETE',
        });
        return true;
    } catch (error) {
        console.error("Error deleting area:", error);
        return false;
    }
};
