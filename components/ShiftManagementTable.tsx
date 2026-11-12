import React, { useState, useEffect } from 'react';
import { useShifts } from '../hooks/useShifts';
import { Shift } from '../types';
import Modal from './Modal';
import LoadingSpinner from './LoadingSpinner';
import toast from 'react-hot-toast';

const ShiftManagementTable: React.FC = () => {
  const { shifts, loadingShifts, addShift, updateShift, deleteShift, refreshShifts } = useShifts();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentShift, setCurrentShift] = useState<Partial<Shift> | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    refreshShifts();
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openModalForCreate = () => {
    setCurrentShift({ name: '' });
    setIsEditMode(false);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openModalForEdit = (shift: Shift) => {
    setCurrentShift({ ...shift });
    setIsEditMode(true);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentShift(null);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (currentShift) {
      setCurrentShift({ ...currentShift, [e.target.name]: e.target.value });
    }
  };

  const handleSubmit = async () => {
    if (!currentShift || !currentShift.name) {
      setFormError("The shift name is required.");
      return;
    }
    setFormError(null);

    let success = false;
    if (isEditMode && currentShift.id) {
      success = !!(await updateShift(currentShift.id, { name: currentShift.name }));
    } else {
      success = !!(await addShift(currentShift as Omit<Shift, 'id'>));
    }

    if (success) {
      toast.success(`Shift ${isEditMode ? 'updated' : 'created'} successfully!`);
      handleCloseModal();
      refreshShifts();
    } else {
      setFormError(`Error ${isEditMode ? 'updating' : 'creating'} the shift.`);
    }
  };

  const handleDeleteShift = async (shiftId: string) => {
    if (window.confirm('¿Eliminar este turno? Solo se permite si no tiene usuarios asignados.')) {
        const ok = await deleteShift(shiftId);
        if (ok) {
            toast.success('Turno eliminado.');
            refreshShifts();
        } else {
            toast.error('No se pudo eliminar: puede que tenga usuarios asignados.');
        }
    }
  };


  if (loadingShifts) {
    return <LoadingSpinner message="Loading shifts..." />;
  }

  const inputClass = "mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm";
  const labelClass = "block text-sm font-medium text-slate-700 dark:text-slate-300";

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Shift Management</h2>
        <button
          onClick={openModalForCreate}
          className="bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-colors"
        >
          Create Shift
        </button>
      </div>
      
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
          <thead className="bg-slate-50 dark:bg-slate-700/50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Shift Name</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
            {shifts.map((shift) => (
              <tr key={shift.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800 dark:text-slate-100">{shift.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button onClick={() => openModalForEdit(shift)} className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors">Edit</button>
                    <button onClick={() => handleDeleteShift(shift.id)} className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors">Delete</button>
                </td>
              </tr>
            ))}
             {shifts.length === 0 && (
                <tr>
                    <td colSpan={2} className="px-6 py-4 text-center text-sm text-slate-500 dark:text-slate-400">No shifts registered.</td>
                </tr>
            )}
          </tbody>
        </table>
      </div>

     <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={isEditMode ? 'Edit Shift' : 'Create Shift'}>
        {currentShift && (
          <form className="space-y-4">
             {formError && <p className="text-red-500 dark:text-red-400 text-sm bg-red-50 dark:bg-red-500/10 p-2 rounded">{formError}</p>}
            <div>
              <label htmlFor="name" className={labelClass}>Shift Name</label>
              <input type="text" name="name" id="name" value={currentShift.name || ''} onChange={handleFormChange} required 
                     className={inputClass}/>
            </div>
             <div className="flex justify-end space-x-3 pt-4">
                 <button type="button" onClick={handleCloseModal} className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 rounded-md shadow-sm transition-colors">Cancel</button>
                <button type="button" onClick={handleSubmit} className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md shadow-sm">
                    {isEditMode ? 'Save Changes' : 'Create Shift'}
                </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default ShiftManagementTable;