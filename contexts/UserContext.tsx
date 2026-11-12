import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User } from '../types';
import { 
  getUsers,
  addUser as addUserInDb,
  updateUser as updateUserInDb,
  deleteUser as deleteUserInDb
} from '../services/userService';

interface UserContextType {
  users: User[];
  loadingUsers: boolean;
  addUser: (userData: User) => Promise<User | null>;
  updateUser: (userId: string, userData: Partial<Omit<User, 'id'>>) => Promise<User | null>;
  deleteUser: (userId: string) => Promise<boolean>;
  refreshUsers: () => void;
}

export const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(true);

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const fetchedUsers = await getUsers();
      setUsers(fetchedUsers);
    } catch (e) {
      console.error('Failed to load users:', e);
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const addUser = async (userData: User): Promise<User | null> => {
    const result = await addUserInDb(userData);
    if (result) loadUsers();
    return result;
  };
  
  const updateUser = async (userId: string, userData: Partial<Omit<User, 'id'>>): Promise<User | null> => {
    const result = await updateUserInDb(userId, userData);
    if (result) loadUsers();
    return result;
  };

  const deleteUser = async (userId: string): Promise<boolean> => {
    const result = await deleteUserInDb(userId);
    if (result) loadUsers();
    return result;
  };

  const refreshUsers = useCallback(() => {
    loadUsers();
  }, [loadUsers]);

  return (
    <UserContext.Provider value={{ users, loadingUsers, addUser, updateUser, deleteUser, refreshUsers }}>
      {children}
    </UserContext.Provider>
  );
};
