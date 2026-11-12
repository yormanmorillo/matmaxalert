import { User } from '../types';
import { apiFetch, normalizeIds, normalizeId } from './api';

export const getUsers = async (): Promise<User[]> => {
    const data = await apiFetch('/users');
    return normalizeIds(data);
};

export const addUser = async (userData: User): Promise<User | null> => {
    return apiFetch('/users', {
        method: 'POST',
        body: JSON.stringify(userData),
    });
};

export const updateUser = async (userId: string, updates: Partial<Omit<User, 'id'>>): Promise<User | null> => {
    return apiFetch(`/users/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
    });
};

export const deleteUser = async (userId: string): Promise<boolean> => {
    try {
        await apiFetch(`/users/${userId}`, {
            method: 'DELETE',
        });
        return true;
    } catch (error) {
        console.error("Error deleting user:", error);
        return false;
    }
};
