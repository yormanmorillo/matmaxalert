import { Role } from '../types';
import { apiFetch, normalizeIds, normalizeId } from './api';

export const getRoles = async (): Promise<Role[]> => {
    const data = await apiFetch('/roles');
    return normalizeIds(data);
};

export const addRole = async (roleData: Omit<Role, 'isCore'>): Promise<Role | null> => {
    return apiFetch('/roles', {
        method: 'POST',
        body: JSON.stringify(roleData),
    });
};

export const updateRole = async (roleId: string, updates: Partial<Role>): Promise<Role | null> => {
    return apiFetch(`/roles/${roleId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
    });
};

export const deleteRole = async (roleId: string): Promise<boolean> => {
    try {
        await apiFetch(`/roles/${roleId}`, {
            method: 'DELETE',
        });
        return true;
    } catch (error) {
        console.error("Error deleting role:", error);
        return false;
    }
};
