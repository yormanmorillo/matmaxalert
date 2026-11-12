import React, { useState, useEffect, useMemo } from 'react';
import { usePresses } from '../hooks/usePresses';
import { useAreas } from '../hooks/useAreas';
import { Press } from '../types';
import Modal from './Modal';
import LoadingSpinner from './LoadingSpinner';
import toast from 'react-hot-toast';

interface PressManagementTableProps {
    showExtendedAdminControls: boolean;
}

const PressManagementTable: React.FC<PressManagementTableProps> = ({ showExtendedAdminControls }) => {
  const { presses, loadingPresses, addPress, updatePress, deletePress, refreshPresses } = usePresses();
  const { areas, loadingAreas } = useAreas();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPress, setCurrentPress] = useState<Partial<Press> | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [filterArea, setFilterArea] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  
  const areasMap = useMemo(() => new Map(areas.map(a => [a.id, a.name])), [areas]);

  useEffect(() => {
    refreshPresses();
  }, [refreshPresses]);

  const filteredPresses = useMemo(() => {
    return presses.filter(press => {
        const areaMatch = filterArea === 'all' || press.areaId === filterArea;
        const statusMatch = filterStatus === 'all' || press.status === filterStatus;
        return areaMatch && statusMatch;
    });
  }, [presses, filterArea, filterStatus]);


  const openModalForCreate = () => {
    setCurrentPress({ name: '', areaId: areas[0]?.id || '', status: 'Operational' });
    setIsEditMode(false);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openModalForEdit = (press: Press) => {
    setCurrentPress({ ...press });
    setIsEditMode(true);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentPress(null);
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (currentPress) {
      setCurrentPress({ ...currentPress, [e.target.name]: e.target.value });
    }
  };

  const handleSubmit = async () => {
    if (!currentPress || !currentPress.name || !currentPress.areaId) {
      setFormError("Press name and area are required.");
      return;
    }
    setFormError(null);

    let success = false;
    if (isEditMode && currentPress.id) {
      success = !!(await updatePress(currentPress.id, currentPress));
    } else {
      success = !!(await addPress(currentPress as Omit<Press, 'id'>));
    }

    if (success) {
      toast.success(`Press ${isEditMode ? 'updated' : 'created'} successfully!`);
      handleCloseModal();
      refreshPresses();
    } else {
      setFormError(`Error ${isEditMode ? 'updating' : 'creating'} press.`);
    }
  };

  const handleDeletePress = async (pressId: string) => {
    if (window.confirm('¿Eliminar esta prensa? Solo se permite si no tiene alertas activas.')) {
        const ok = await deletePress(pressId);
        if (ok) {
            toast.success('Prensa eliminada.');
        } else {
            toast.error('No se pudo eliminar: puede que tenga alertas activas.');
        }
    }
  };


  if (loadingPresses || loadingAreas) {
    return <LoadingSpinner message="Loading presses and areas..." />;
  }

  const inputClass = "mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm";
  const labelClass = "block text-sm font-medium text-slate-700 dark:text-slate-300";

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Press Management</h2>
        {showExtendedAdminControls && (
            <button
            onClick={openModalForCreate}
            className="bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-colors"
            >
            Create Press
            </button>
        )}
      </div>

       <div className="flex flex-col sm:flex-row gap-4 mb-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
        <div className="flex-1">
          <label htmlFor="area-filter" className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
            Filter by Area
          </label>
          <select
            id="area-filter"
            name="area-filter"
            value={filterArea}
            onChange={(e) => setFilterArea(e.target.value)}
            className={inputClass}
          >
            <option value="all">All Areas</option>
            {areas.map(area => <option key={area.id} value={area.id}>{area.name}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <label htmlFor="status-filter" className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
            Filter by Status
          </label>
            <select
              id="status-filter"
              name="status-filter"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className={inputClass}
            >
              <option value="all">All Statuses</option>
              <option value="Operational">Operational</option>
              <option value="Maintenance">Maintenance</option>
              <option value="OutOfService">Out of Service</option>
            </select>
        </div>
      </div>
      
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md rounded-lg overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
          <thead className="bg-slate-50 dark:bg-slate-700/50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Press ID</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Name</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Area</th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
              {showExtendedAdminControls && <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
            {filteredPresses.length > 0 ? filteredPresses.map((press) => (
              <tr key={press.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-800 dark:text-slate-100">{press.id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">{press.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">{areasMap.get(press.areaId) || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 dark:text-slate-300">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${press.status === 'Operational' ? 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400' : press.status === 'Maintenance' ? 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400' : 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400'}`}>
                        {press.status}
                    </span>
                </td>
                {showExtendedAdminControls && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button onClick={() => openModalForEdit(press)} className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors">Edit</button>
                        <button onClick={() => handleDeletePress(press.id)} className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors">Delete</button>
                    </td>
                )}
              </tr>
            )) : (
                <tr>
                    <td colSpan={showExtendedAdminControls ? 5 : 4} className="px-6 py-4 text-center text-sm text-slate-500 dark:text-slate-400">No presses found matching the filters.</td>
                </tr>
            )}
          </tbody>
        </table>
      </div>

     {showExtendedAdminControls && <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={isEditMode ? 'Edit Press' : 'Create Press'}>
        {currentPress && (
          <form className="space-y-4">
             {formError && <p className="text-red-500 dark:text-red-400 text-sm bg-red-50 dark:bg-red-500/10 p-2 rounded">{formError}</p>}
            <div>
              <label htmlFor="name" className={labelClass}>Press Name</label>
              <input type="text" name="name" id="name" value={currentPress.name || ''} onChange={handleFormChange} required 
                     className={inputClass}/>
            </div>
            <div>
              <label htmlFor="areaId" className={labelClass}>Area</label>
               <select name="areaId" id="areaId" value={currentPress.areaId || ''} onChange={handleFormChange} required
                      className={inputClass}>
                <option value="" disabled>Select an area</option>
                {areas.map(area => (
                  <option key={area.id} value={area.id}>{area.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="status" className={labelClass}>Status</label>
              <select name="status" id="status" value={currentPress.status || 'Operational'} onChange={handleFormChange}
                      className={inputClass}>
                <option value="Operational">Operational</option>
                <option value="Maintenance">Maintenance</option>
                <option value="OutOfService">Out of Service</option>
              </select>
            </div>
             <div className="flex justify-end space-x-3 pt-4">
                 <button type="button" onClick={handleCloseModal} className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 rounded-md shadow-sm transition-colors">Cancel</button>
                <button type="button" onClick={handleSubmit} className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md shadow-sm">
                    {isEditMode ? 'Save Changes' : 'Create Press'}
                </button>
            </div>
          </form>
        )}
      </Modal>}
    </div>
  );
};

export default PressManagementTable;