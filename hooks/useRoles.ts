
import { useContext } from 'react';
import { RoleContext } from '../contexts/RoleContext';

export const useRoles = () => {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error('useRoles must be used within a RoleProvider');
  }
  return context;
};