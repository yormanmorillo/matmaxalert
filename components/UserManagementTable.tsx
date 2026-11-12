import React, { useState, useEffect, useMemo } from 'react';
import { useUsers } from '../hooks/useUsers';
import { useShifts } from '../hooks/useShifts';
import { useRoles } from '../hooks/useRoles';
import { User } from '../types';
import Modal from './Modal';
import LoadingSpinner from './LoadingSpinner';
import toast from 'react-hot-toast';

const UserManagementTable: React.FC = () => {
  const { users, loadingUsers, addUser, updateUser, deleteUser, refreshUsers } = useUsers();
  const { shifts, loadingShifts, refreshShifts } = useShifts();
  const { roles, loadingRoles } = useRoles();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<Partial<User> | null>(null);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedShift, setSelectedShift] = useState<string>('all');

  const shiftsMap = useMemo(() => new Map(shifts.map(s => [s.id, s.name])), [shifts]);
  const rolesMap = useMemo(() => new Map(roles.map(r => [r.id, r.displayName])), [roles]);

  useEffect(() => {
    refreshUsers();
    refreshShifts();
  }, []);

  const filteredUsers = useMemo(() => {
    return users
      .filter(user => selectedRole === 'all' || user.role === selectedRole)
      .filter(user => {
        if (selectedShift === 'all') return true;
        if (selectedShift === 'unassigned') return !user.shiftId;
        return user.shiftId === selectedShift;
      });
  }, [users, selectedRole, selectedShift]);

  const openModalForCreate = () => {
    const defaultRole = roles.find(r => r.id === 'technical');
    setCurrentUser({ username: '', role: defaultRole?.id || '', shiftId: '', password: '' });
    setIsEditMode(false);
    setFormError(null);
    setConfirmPassword('');
    setIsModalOpen(true);
  };

  const openModalForEdit = (user: User) => {
    setCurrentUser({ ...user, password: '' });
    setIsEditMode(true);
    setFormError(null);
    setConfirmPassword('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentUser(null);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (currentUser) {
      setCurrentUser({ ...currentUser, [e.target.name]: e.target.value });
    }
  };

  const handleSubmit = async () => {
    if (!currentUser || !currentUser.username || !currentUser.role) {
      setFormError('Usuario y rol son obligatorios.');
      return;
    }
    setFormError(null);

    try {
      if (isEditMode && currentUser.id) {
        const original = users.find(u => u.id === currentUser.id);
        const updateData: any = {};

        if (currentUser.username !== original?.username) updateData.username = currentUser.username;
        if (currentUser.role !== original?.role) updateData.role = currentUser.role;
        if ((currentUser.shiftId || undefined) !== (original?.shiftId || undefined)) {
          updateData.shiftId = currentUser.shiftId || undefined;
        }
        if (JSON.stringify(currentUser.assignedPressIds || []) !== JSON.stringify(original?.assignedPressIds || [])) {
          updateData.assignedPressIds = currentUser.assignedPressIds || [];
        }
        if (JSON.stringify(currentUser.allowedSections || []) !== JSON.stringify(original?.allowedSections || [])) {
          updateData.allowedSections = currentUser.allowedSections || [];
        }

        if (currentUser.password) {
          if (currentUser.password !== confirmPassword) {
            setFormError('Las contraseñas no coinciden.');
            return;
          }
          if (currentUser.password.length < 8) {
            setFormError('La contraseña debe tener al menos 8 caracteres.');
            return;
          }
          updateData.password = currentUser.password;
        }

        // Pasar de un rol de kiosko a uno con login exige contraseña utilizable.
        const newRole = roles.find(r => r.id === currentUser.role);
        const oldRole = roles.find(r => r.id === original?.role);
        if (newRole?.requiresAuth && !oldRole?.requiresAuth && !currentUser.password) {
          setFormError('Este rol requiere contraseña. Define una antes de guardar.');
          return;
        }

        if (Object.keys(updateData).length === 0) {
          setFormError('No hay cambios que guardar.');
          return;
        }

        await updateUser(currentUser.id, updateData);
      } else {
        const selectedRoleObj = roles.find(r => r.id === currentUser.role);
        if (selectedRoleObj?.requiresAuth && !currentUser.password) {
          setFormError('La contraseña es obligatoria para este rol.');
          return;
        }
        await addUser(currentUser as User);
      }

      toast.success(`Usuario ${isEditMode ? 'actualizado' : 'creado'} correctamente.`);
      handleCloseModal();
      refreshUsers();
    } catch (err: any) {
      setFormError(err?.message || 'No se pudo guardar el usuario.');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const userToDelete = users.find(u => u.id === userId);
    if (userToDelete?.role === 'admin') {
      alert('El rol administrador no se puede eliminar desde aquí.');
      return;
    }

    if (!window.confirm('¿Eliminar este usuario?')) return;

    const ok = await deleteUser(userId);
    if (!ok) toast.error('No se pudo eliminar el usuario.');
  };

  const isLoading = loadingUsers || loadingShifts || loadingRoles;

  if (isLoading) {
    return <LoadingSpinner message="Loading management data..." />;
  }

  const inputClass = "mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm";
  const labelClass = "block text-sm font-medium text-slate-700 dark:text-slate-300";

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">User Management</h2>
        <button
          onClick={openModalForCreate}
          className="bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-colors"
        >
          Create User
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
        <div className="flex-1">
          <label htmlFor="role-filter" className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
            Filter by Role
          </label>
          <select
            id="role-filter"
            name="role-filter"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className={inputClass}
          >
            <option value="all">All Roles</option>
            {roles.map(role => (
              <option key={role.id} value={role.id}>{role.displayName}</option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label htmlFor="shift-filter" className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
            Filter by Shift
          </label>
          <select
            id="shift-filter"
            name="shift-filter"
            value={selectedShift}
            onChange={(e) => setSelectedShift(e.target.value)}
            className={inputClass}
          >
            <option value="all">All Shifts</option>
            <option value="unassigned">Unassigned</option>
            {shifts.map(shift => (
              <option key={shift.id} value={shift.id}>{shift.name}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
          <thead className="bg-slate-50 dark:bg-slate-700/50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Username</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Role</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Shift</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
            {filteredUsers.length > 0 ? filteredUsers.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800 dark:text-slate-100">{user.username}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">{rolesMap.get(user.role) || user.role}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">{user.shiftId ? shiftsMap.get(user.shiftId) || 'N/A' : 'Unassigned'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                  <button onClick={() => openModalForEdit(user)} className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors">Edit</button>
                  {user.role !== 'admin' && 
                    <button onClick={() => handleDeleteUser(user.id)} className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors">Delete</button>
                  }
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={4} className="text-center py-4 text-slate-500 dark:text-slate-400">
                  No users found matching the selected filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={isEditMode ? 'Edit User Profile' : 'Create User'}>
        {currentUser && (
          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            {formError && <p className="text-red-500 dark:text-red-400 text-sm bg-red-50 dark:bg-red-500/10 p-2 rounded">{formError}</p>}
            <div>
              <label htmlFor="username" className={labelClass}>Username</label>
              <input type="text" name="username" id="username" value={currentUser.username || ''} onChange={handleFormChange} required 
                     className={inputClass}/>
            </div>
            
            <div>
              <label htmlFor="role" className={labelClass}>Role</label>
              <select name="role" id="role" value={currentUser.role || ''} onChange={handleFormChange} required
                      className={inputClass}>
                <option value="" disabled>Select a role</option>
                {roles.map(role => (
                  <option key={role.id} value={role.id}>{role.displayName}</option>
                ))}
              </select>
            </div>

            {isEditMode ? (
                <fieldset className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-4">
                    <legend className="text-sm font-medium text-slate-500 dark:text-slate-400">Change Password (optional)</legend>
                    <div className="space-y-4 mt-2">
                        <div>
                            <label htmlFor="password" className={labelClass}>New Password</label>
                            <input type="password" name="password" id="password" value={currentUser.password || ''} onChange={handleFormChange}
                                    className={inputClass}/>
                        </div>
                        <div>
                            <label htmlFor="confirmPassword" className={labelClass}>Confirm New Password</label>
                            <input type="password" name="confirmPassword" id="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                                    className={inputClass}/>
                        </div>
                    </div>
                </fieldset>
            ) : (
                 (roles.find(r => r.id === currentUser.role)?.requiresAuth ?? true) && (
                 <div className="mt-4">
                    <label htmlFor="password" className={labelClass}>Password</label>
                    <input type="password" name="password" id="password" value={currentUser.password || ''} onChange={handleFormChange} required 
                            className={inputClass}/>
                 </div>
                 )
            )}
             <div>
                <label htmlFor="shiftId" className={labelClass}>Shift</label>
                <select name="shiftId" id="shiftId" value={currentUser.shiftId || ''} onChange={handleFormChange}
                    className={inputClass}>
                    <option value="">Unassigned</option>
                    {shifts.map(shift => (
                        <option key={shift.id} value={shift.id}>{shift.name}</option>
                    ))}
                </select>
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
                 <button type="button" onClick={handleCloseModal} className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 rounded-md shadow-sm transition-colors">Cancel</button>
                <button type="button" onClick={handleSubmit} className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md shadow-sm">
                    {isEditMode ? 'Save Changes' : 'Create User'}
                </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default UserManagementTable;