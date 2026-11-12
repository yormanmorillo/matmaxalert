import React, { useState, useMemo } from 'react';
import { useUsers } from '../hooks/useUsers';
import { useShifts } from '../hooks/useShifts';
import { User } from '../types';
import Modal from './Modal';
import LoadingSpinner from './LoadingSpinner';
import { apiFetch } from '../services/api';
import toast from 'react-hot-toast';

const SupervisorPermissionsTable: React.FC = () => {
    const { users, updateUser, loadingUsers } = useUsers();
    const { shifts, loadingShifts } = useShifts();
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSupervisor, setSelectedSupervisor] = useState<User | null>(null);
    const [currentPermissions, setCurrentPermissions] = useState<Set<string>>(new Set());
    const [isSaving, setIsSaving] = useState(false);
    const [isLoadingPermissions, setIsLoadingPermissions] = useState(false);

    const supervisors = useMemo(() => users.filter(u => u.role === 'supervisor'), [users]);
    const shiftsMap = useMemo(() => new Map(shifts.map(s => [s.id, s.name])), [shifts]);
    
    const availableSections = useMemo(() => [
        { id: 'users', label: 'User Management' },
        { id: 'roles', label: 'Role Management' },
        { id: 'shifts', label: 'Shift Management' },
        { id: 'areas', label: 'Area Management' },
        { id: 'presses', label: 'Press Management' },
        { id: 'alertConfig', label: 'Alert Button Config' },
        { id: 'driverPressAssignment', label: 'Press Assignment' },
        { id: 'reports', label: 'Reports' },
    ], []);

    const handleOpenModal = async (supervisor: User) => {
        setSelectedSupervisor(supervisor);
        setIsModalOpen(true);
        setIsLoadingPermissions(true);
        setCurrentPermissions(new Set());
        try {
            // GET /users (lista) no expone allowedSections a propósito:
            // se pide el detalle para no guardar un set vacío y borrar permisos.
            const full = await apiFetch<User>(`/users/${supervisor.id}`);
            setCurrentPermissions(new Set(full.allowedSections || []));
        } catch (err: any) {
            toast.error(err?.message || 'No se pudieron cargar los permisos.');
        } finally {
            setIsLoadingPermissions(false);
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedSupervisor(null);
        setCurrentPermissions(new Set());
    };

    const handlePermissionChange = (sectionId: string, isChecked: boolean) => {
        const newSet = new Set(currentPermissions);
        if (isChecked) {
            newSet.add(sectionId);
        } else {
            newSet.delete(sectionId);
        }
        setCurrentPermissions(newSet);
    };
    
    const handleSave = async () => {
        if (!selectedSupervisor) return;
        setIsSaving(true);
        try {
            const result = await updateUser(selectedSupervisor.id, {
                allowedSections: Array.from(currentPermissions),
            });
            if (!result) throw new Error('No se pudieron guardar los permisos.');
            toast.success('Permisos actualizados.');
            handleCloseModal();
        } catch (err: any) {
            toast.error(err?.message || 'No se pudieron guardar los permisos.');
        } finally {
            setIsSaving(false);
        }
    };

    const getPermissionsSummary = (supervisor: User): string => {
        if (!supervisor.allowedSections || supervisor.allowedSections.length === 0) {
            return 'None';
        }
        return supervisor.allowedSections
            .map(id => availableSections.find(s => s.id === id)?.label || id)
            .join(', ');
    };

    const isLoading = loadingUsers || loadingShifts;

    if (isLoading) {
        return <LoadingSpinner message="Loading permission data..." />;
    }

    return (
        <div>
            <div className="mb-6">
                <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Supervisor Permissions</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Delegate access to administrative sections for specific supervisors.</p>
            </div>
            
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md rounded-lg overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                    <thead className="bg-slate-50 dark:bg-slate-700/50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Supervisor</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Shift</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Delegated Permissions</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                        {supervisors.length > 0 ? supervisors.map((supervisor) => (
                            <tr key={supervisor.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800 dark:text-slate-100">{supervisor.username}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">{supervisor.shiftId ? shiftsMap.get(supervisor.shiftId) || 'N/A' : 'Unassigned'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300 max-w-sm truncate" title={getPermissionsSummary(supervisor)}>
                                    {getPermissionsSummary(supervisor)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <button onClick={() => handleOpenModal(supervisor)} className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors">
                                        Manage Permissions
                                    </button>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={4} className="text-center py-4 text-slate-500 dark:text-slate-400">
                                    No users with the Supervisor role found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={`Permissions for ${selectedSupervisor?.username || ''}`}>
                {selectedSupervisor && (
                    <div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Select the sections this supervisor can access.</p>
                        <div className="max-h-96 overflow-y-auto space-y-2 border border-slate-200 dark:border-slate-700 p-3 rounded-md bg-slate-50 dark:bg-slate-900 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                           {availableSections.map(section => (
                               <label key={section.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={currentPermissions.has(section.id)}
                                        disabled={isLoadingPermissions || isSaving}
                                        onChange={(e) => handlePermissionChange(section.id, e.target.checked)}
                                        className="h-4 w-4 text-primary-600 border-slate-300 dark:border-slate-500 rounded focus:ring-primary-500 bg-white dark:bg-slate-700"
                                    />
                                    <span className="font-medium text-sm text-slate-700 dark:text-slate-300">{section.label}</span>
                               </label>
                           ))}
                        </div>
                        <div className="flex justify-end space-x-3 pt-6">
                            <button type="button" onClick={handleCloseModal} className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 rounded-md shadow-sm transition-colors">Cancel</button>
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={isSaving || isLoadingPermissions}
                                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md shadow-sm disabled:opacity-50"
                            >
                                {isSaving ? 'Saving...' : isLoadingPermissions ? 'Loading...' : 'Save Permissions'}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default SupervisorPermissionsTable;