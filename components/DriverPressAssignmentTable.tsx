import React, { useState, useMemo } from 'react';
import { useUsers } from '../hooks/useUsers';
import { useRoles } from '../hooks/useRoles';
import { usePresses } from '../hooks/usePresses';
import { useAreas } from '../hooks/useAreas';
import { useShifts } from '../hooks/useShifts';
import { User, Press } from '../types';
import Modal from './Modal';
import LoadingSpinner from './LoadingSpinner';
import toast from 'react-hot-toast';

const DriverPressAssignmentTable: React.FC = () => {
    const { users, updateUser, loadingUsers } = useUsers();
    const { roles, loadingRoles } = useRoles();
    const { presses, loadingPresses } = usePresses();
    const { areas, loadingAreas } = useAreas();
    const { shifts, loadingShifts } = useShifts();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDriver, setSelectedDriver] = useState<User | null>(null);
    const [assignedPressIds, setAssignedPressIds] = useState<Set<string>>(new Set());
    const [isSaving, setIsSaving] = useState(false);
    const [selectedShift, setSelectedShift] = useState<string>('all');

    const [selectedRole, setSelectedRole] = useState<string>('all');

    const assignableUsers = useMemo(() => users.filter(u => u.role !== 'admin'), [users]);
    const pressesMap = useMemo(() => new Map(presses.map(p => [p.id, p])), [presses]);
    const areasMap = useMemo(() => new Map(areas.map(a => [a.id, a.name])), [areas]);
    const shiftsMap = useMemo(() => new Map(shifts.map(s => [s.id, s.name])), [shifts]);
    const rolesMap = useMemo(() => new Map(roles.map(r => [r.id, r.displayName])), [roles]);

    const filteredUsers = useMemo(() => {
        let filtered = assignableUsers;
        if (selectedRole !== 'all') {
            filtered = filtered.filter(u => u.role === selectedRole);
        }
        if (selectedShift !== 'all') {
            if (selectedShift === 'unassigned') {
                filtered = filtered.filter(d => !d.shiftId);
            } else {
                filtered = filtered.filter(d => d.shiftId === selectedShift);
            }
        }
        return filtered;
    }, [assignableUsers, selectedRole, selectedShift]);

    const pressesByArea = useMemo(() => {
        const grouped: { [areaId: string]: Press[] } = {};
        for (const press of presses) {
            const areaId = press.areaId || 'unassigned';
            if (!grouped[areaId]) {
                grouped[areaId] = [];
            }
            grouped[areaId].push(press);
        }
        
        const sortedAreaIds = Object.keys(grouped).sort((a,b) => (areasMap.get(a) || 'ZZZ').localeCompare(areasMap.get(b) || 'ZZZ'));

        return sortedAreaIds.map(areaId => ({
            areaId,
            areaName: areasMap.get(areaId) || 'Presses without Area',
            presses: grouped[areaId].sort((pa, pb) => pa.name.localeCompare(pb.name))
        }));
    }, [presses, areasMap]);


    const handleOpenModal = (driver: User) => {
        setSelectedDriver(driver);
        setAssignedPressIds(new Set(driver.assignedPressIds || []));
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedDriver(null);
        setAssignedPressIds(new Set());
    };

    const handleIndividualCheckboxChange = (pressId: string, isChecked: boolean) => {
        const newSet = new Set(assignedPressIds);
        if (isChecked) {
            newSet.add(pressId);
        } else {
            newSet.delete(pressId);
        }
        setAssignedPressIds(newSet);
    };
    
    const handleAreaCheckboxChange = (areaPresses: Press[], isChecked: boolean) => {
        const newSet = new Set(assignedPressIds);
        const areaPressIds = areaPresses.map(p => p.id);

        if (isChecked) {
            areaPressIds.forEach(id => newSet.add(id));
        } else {
            areaPressIds.forEach(id => newSet.delete(id));
        }
        setAssignedPressIds(newSet);
    };

    const handleSave = async () => {
        if (!selectedDriver) return;

        setIsSaving(true);
        try {
            const result = await updateUser(selectedDriver.id, { assignedPressIds: Array.from(assignedPressIds) });
            if (!result) throw new Error('No se pudieron guardar las asignaciones.');
            toast.success(`Asignaciones de ${selectedDriver.username} guardadas.`);
            handleCloseModal();
        } catch (err: any) {
            toast.error(err?.message || 'No se pudieron guardar las asignaciones.');
        } finally {
            setIsSaving(false);
        }
    };

    const isLoading = loadingUsers || loadingPresses || loadingAreas || loadingShifts || loadingRoles;

    if (isLoading) {
        return <LoadingSpinner message="Loading assignment data..." />;
    }

    const inputClass = "w-full mt-1 block px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm";

    return (
        <div>
            <div className="mb-6">
                <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">User Press Assignment</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Assign which presses each user is responsible for.</p>
            </div>
            
             <div className="flex flex-col sm:flex-row gap-4 mb-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="flex-1">
                    <label htmlFor="role-filter" className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                        Filter by Role
                    </label>
                    <select
                        id="role-filter"
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value)}
                        className={inputClass}
                    >
                        <option value="all">All Roles</option>
                        {roles.filter(r => r.id !== 'admin').map(role => (
                            <option key={role.id} value={role.id}>{role.displayName}</option>
                        ))}
                    </select>
                </div>
                <div className="flex-1">
                <label htmlFor="shift-filter-user" className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
                    Filter by Shift
                </label>
                <select
                    id="shift-filter-user"
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
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">User</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Role</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Shift</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Assigned Presses</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                        {filteredUsers.length > 0 ? filteredUsers.map((user) => (
                            <tr key={user.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800 dark:text-slate-100">{user.username}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">{rolesMap.get(user.role) || user.role}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">{user.shiftId ? shiftsMap.get(user.shiftId) || 'N/A' : 'Unassigned'}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300 max-w-sm truncate" title={(user.assignedPressIds || []).map(id => pressesMap.get(id)?.name).join(', ')}>
                                    {(user.assignedPressIds || []).length} presses
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                    <button onClick={() => handleOpenModal(user)} className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors">
                                        Manage
                                    </button>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={5} className="text-center py-4 text-slate-500 dark:text-slate-400">
                                    No users found matching the selected filters.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={`Manage Assignment: ${selectedDriver?.username || ''}`}>
                {selectedDriver && (
                    <div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Select the presses that this user will manage.</p>
                        <div className="max-h-96 overflow-y-auto space-y-4 border border-slate-200 dark:border-slate-700 p-3 rounded-md bg-slate-50 dark:bg-slate-900">
                            {pressesByArea.map(({ areaId, areaName, presses: areaPresses }) => {
                                const areaPressIds = areaPresses.map(p => p.id);
                                const isAllChecked = areaPressIds.length > 0 && areaPressIds.every(id => assignedPressIds.has(id));

                                return (
                                    <div key={areaId}>
                                        <div className="flex items-center p-2 bg-white dark:bg-slate-800 rounded-t-md border-b border-slate-200 dark:border-slate-700">
                                            <input
                                                type="checkbox"
                                                id={`area-checkbox-${areaId}`}
                                                checked={isAllChecked}
                                                onChange={(e) => handleAreaCheckboxChange(areaPresses, e.target.checked)}
                                                className="h-4 w-4 text-primary-600 border-slate-300 dark:border-slate-500 rounded focus:ring-primary-500 bg-white dark:bg-slate-700"
                                            />
                                            <label htmlFor={`area-checkbox-${areaId}`} className="ml-2 font-semibold text-sm text-slate-700 dark:text-slate-200">{areaName}</label>
                                        </div>
                                        <div className="p-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                                            {areaPresses.map(press => (
                                                <label key={press.id} className="flex items-center space-x-2 p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        id={`press-checkbox-${press.id}`}
                                                        checked={assignedPressIds.has(press.id)}
                                                        onChange={(e) => handleIndividualCheckboxChange(press.id, e.target.checked)}
                                                        className="h-4 w-4 text-primary-600 border-slate-300 dark:border-slate-500 rounded focus:ring-primary-500 bg-white dark:bg-slate-700"
                                                    />
                                                    <span className="text-sm text-slate-700 dark:text-slate-300">{press.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="flex justify-end space-x-3 pt-6">
                            <button type="button" onClick={handleCloseModal} className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 rounded-md shadow-sm transition-colors">Cancel</button>
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={isSaving}
                                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md shadow-sm disabled:opacity-50"
                            >
                                {isSaving ? 'Saving...' : 'Save Assignments'}
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default DriverPressAssignmentTable;