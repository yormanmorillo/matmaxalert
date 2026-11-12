import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Role } from '../types';
import {
  getRoles,
  addRole as addRoleInDb,
  updateRole as updateRoleInDb,
  deleteRole as deleteRoleInDb
} from '../services/roleService';

interface RoleContextType {
  roles: Role[];
  loadingRoles: boolean;
  addRole: (roleData: Omit<Role, 'isCore'>) => Promise<Role | null>;
  updateRole: (roleId: string, roleData: Partial<Role>) => Promise<Role | null>;
  deleteRole: (roleId: string) => Promise<boolean>;
  refreshRoles: () => void;
}

export const RoleContext = createContext<RoleContextType | undefined>(undefined);

export const RoleProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loadingRoles, setLoadingRoles] = useState<boolean>(true);

  const loadRoles = useCallback(async () => {
    setLoadingRoles(true);
    try {
      const fetchedRoles = await getRoles();
      setRoles(fetchedRoles);
    } catch (e) {
      console.error('Failed to load roles:', e);
    } finally {
      setLoadingRoles(false);
    }
  }, []);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  const addRole = async (roleData: Omit<Role, 'isCore'>): Promise<Role | null> => {
    const result = await addRoleInDb(roleData);
    if (result) loadRoles();
    return result;
  };

  const updateRole = async (roleId: string, roleData: Partial<Role>): Promise<Role | null> => {
    const result = await updateRoleInDb(roleId, roleData);
    if (result) loadRoles();
    return result;
  };

  const deleteRole = async (roleId: string): Promise<boolean> => {
    const result = await deleteRoleInDb(roleId);
    if (result) loadRoles();
    return result;
  };

  const refreshRoles = useCallback(() => {
    loadRoles();
  }, [loadRoles]);

  return (
    <RoleContext.Provider value={{ roles, loadingRoles, addRole, updateRole, deleteRole, refreshRoles }}>
      {children}
    </RoleContext.Provider>
  );
};