import React, { useState, useEffect } from 'react';
import { useRoles } from '../hooks/useRoles';
import { Role } from '../types';
import Modal from './Modal';
import LoadingSpinner from './LoadingSpinner';
import toast from 'react-hot-toast';

const RoleManagementTable: React.FC = () => {
  const { roles, loadingRoles, addRole, updateRole, deleteRole, refreshRoles } = useRoles();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentRole, setCurrentRole] = useState<Partial<Role> | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    refreshRoles();
  }, []);

  const openModalForCreate = () => {
    setCurrentRole({ id: '', displayName: '', requiresAuth: false });
    setIsEditMode(false);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openModalForEdit = (role: Role) => {
    setCurrentRole({ ...role });
    setIsEditMode(true);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentRole(null);
  };

  const generateIdFromName = (name: string): string => {
    return name
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s_]/g, '')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const isCheckbox = type === 'checkbox';
    if (currentRole) {
        const checked = isCheckbox ? (e.target as HTMLInputElement).checked : undefined;
        const updated = { ...currentRole, [name]: isCheckbox ? checked : value };
        if (name === 'displayName' && !isEditMode) {
          updated.id = generateIdFromName(value);
        }
        setCurrentRole(updated);
    }
  };

  const handleSubmit = async () => {
    if (!currentRole || !currentRole.displayName) {
      setFormError("Display Name is required.");
      return;
    }
    
    if (!currentRole.id) {
      currentRole.id = generateIdFromName(currentRole.displayName);
    }
    
    if (!currentRole.id || !/^[a-z0-9_]+$/.test(currentRole.id)) {
        setFormError("Could not generate a valid role ID. Please use a name with letters or numbers.");
        return;
    }

    setFormError(null);

    let success = false;
    if (isEditMode && currentRole.id) {
        const { id, isCore, ...updateData} = currentRole;
        success = !!(await updateRole(id, updateData));
    } else {
        const { isCore, ...createData } = currentRole as Role;
        success = !!(await addRole(createData));
    }

    if (success) {
      toast.success(`Role ${isEditMode ? 'updated' : 'created'} successfully!`);
      handleCloseModal();
      refreshRoles();
    } else {
      setFormError(`Error ${isEditMode ? 'updating' : 'creating'} the role. Verify that the ID and Display Name are not duplicated.`);
    }
  };

  const handleDeleteRole = async (role: Role) => {
    if (role.isCore) {
        alert("Cannot delete a core system role.");
        return;
    }
    if (window.confirm(`¿Eliminar el rol "${role.displayName}"? Solo se permite si no tiene usuarios.`)) {
        const ok = await deleteRole(role.id);
        if (ok) toast.success('Rol eliminado.');
        else toast.error('No se pudo eliminar: puede que tenga usuarios asignados.');
    }
  };


  if (loadingRoles) {
    return <LoadingSpinner message="Loading system roles..." />;
  }

  const inputClass = "mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm";
  const labelClass = "block text-sm font-medium text-slate-700 dark:text-slate-300";

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Role Management</h2>
        <button
          onClick={openModalForCreate}
          className="bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-colors"
        >
          Create Role
        </button>
      </div>
      
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
          <thead className="bg-slate-50 dark:bg-slate-700/50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Display Name</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Role ID</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Type</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
            {roles.map((role) => (
              <tr key={role.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800 dark:text-slate-100">{role.displayName}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300 font-mono">{role.id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">
                    {role.isCore ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300">Core</span>
                    ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-slate-100 dark:bg-slate-600/50 text-slate-700 dark:text-slate-300">Custom</span>
                    )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    {!role.isCore ? (
                        <>
                            <button onClick={() => openModalForEdit(role)} className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors">Edit</button>
                            <button onClick={() => handleDeleteRole(role)} className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors">Delete</button>
                        </>
                    ) : (
                        <span className="text-xs text-slate-400 dark:text-slate-500">Sistema</span>
                    )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

     <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={isEditMode ? 'Edit Role' : 'Create Role'}>
        {currentRole && (
          <form className="space-y-4">
             {formError && <p className="text-red-500 dark:text-red-400 text-sm bg-red-50 dark:bg-red-500/10 p-2 rounded">{formError}</p>}
            <div>
              <label htmlFor="displayName" className={labelClass}>Display Name</label>
              <input type="text" name="displayName" id="displayName" value={currentRole.displayName || ''} onChange={handleFormChange} required 
                     className={inputClass}/>
            </div>
             {isEditMode && (
              <div>
                <label htmlFor="id" className={labelClass}>Role ID</label>
                <input type="text" name="id" id="id" value={currentRole.id || ''} readOnly disabled
                       className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 rounded-md shadow-sm sm:text-sm"/>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Role ID cannot be changed after creation.</p>
              </div>
             )}
            <div>
                <label htmlFor="requiresAuth" className="flex items-center space-x-2">
                    <input
                        type="checkbox"
                        name="requiresAuth"
                        id="requiresAuth"
                        checked={currentRole.requiresAuth || false}
                        onChange={handleFormChange}
                        className="h-4 w-4 text-primary-600 border-slate-300 dark:border-slate-500 rounded focus:ring-primary-500 bg-white dark:bg-slate-700"
                    />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Requires Authentication</span>
                </label>
            </div>
             <div className="flex justify-end space-x-3 pt-4">
                 <button type="button" onClick={handleCloseModal} className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 rounded-md shadow-sm transition-colors">Cancel</button>
                <button type="button" onClick={handleSubmit} className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md shadow-sm">
                    {isEditMode ? 'Save Changes' : 'Create Role'}
                </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default RoleManagementTable;