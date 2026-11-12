import React, { useState, useEffect, useMemo } from 'react';
import { useAlertConfig } from '../hooks/useAlertConfig';
import { useRoles } from '../hooks/useRoles';
import { usePresses } from '../hooks/usePresses';
import { useAreas } from '../hooks/useAreas';
import { useAlerts } from '../hooks/useAlerts';
import { AlertButtonConfig, AlertStatus, Press, SOS_ALERT_TYPE } from '../types';
import LoadingSpinner from './LoadingSpinner';
import toast from 'react-hot-toast';

const AlertConfigForm: React.FC = () => {
  const { buttonConfigs: initialConfigs, loadingConfigs, updateButtonConfigs } = useAlertConfig();
  const { roles, loadingRoles } = useRoles();
  const { presses, loadingPresses } = usePresses();
  const { areas, loadingAreas } = useAreas();
  const { alerts } = useAlerts();
  
  const [configs, setConfigs] = useState<AlertButtonConfig[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedPressesFor, setExpandedPressesFor] = useState<string | null>(null);

  const assignableRoles = useMemo(() => roles.filter(r => r.id !== 'admin'), [roles]);
  const areasMap = useMemo(() => new Map(areas.map(a => [a.id, a.name])), [areas]);

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


  useEffect(() => {
    if (initialConfigs.length > 0) {
        setConfigs(JSON.parse(JSON.stringify(initialConfigs)));
    }
  }, [initialConfigs]);

  const handleConfigChange = (index: number, field: keyof AlertButtonConfig, value: any) => {
    const newConfigs = [...configs];
    newConfigs[index] = { ...newConfigs[index], [field]: value };
    setConfigs(newConfigs);
  };
  
  const handleRoleChange = (configIndex: number, roleId: string, isChecked: boolean) => {
    setConfigs(prev => prev.map((config, index) => {
        if (index !== configIndex) return config;
        const currentRoles = config.allowedRoles || [];
        const allowedRoles = isChecked
            ? (currentRoles.includes(roleId) ? currentRoles : [...currentRoles, roleId])
            : currentRoles.filter(r => r !== roleId);
        return { ...config, allowedRoles };
    }));
  };

  const handlePressAssignmentChange = (configIndex: number, pressId: string, isChecked: boolean) => {
    setConfigs(prev => prev.map((config, index) => {
        if (index !== configIndex) return config;
        const ids = new Set(config.allowedPressIds || []);
        if (isChecked) ids.add(pressId); else ids.delete(pressId);
        return { ...config, allowedPressIds: Array.from(ids) };
    }));
  };

  const handleToggleAllPresses = (configIndex: number, shouldSelectAll: boolean) => {
     setConfigs(prev => prev.map((config, index) => {
         if (index !== configIndex) return config;
         return { ...config, allowedPressIds: shouldSelectAll ? presses.map(p => p.id) : [] };
     }));
  };

  const handleOrderChange = (index: number, direction: 'up' | 'down') => {
    const newConfigs = [...configs];
    const item = newConfigs[index];
    if (direction === 'up' && index > 0) {
      newConfigs.splice(index, 1);
      newConfigs.splice(index - 1, 0, item);
    } else if (direction === 'down' && index < newConfigs.length - 1) {
      newConfigs.splice(index, 1);
      newConfigs.splice(index + 1, 0, item);
    }
    setConfigs(newConfigs.map((config, idx) => ({ ...config, order: idx + 1 })));
  };

  const validateConfigs = (): boolean => {
    const names = new Set<string>();
    for (const config of configs) {
        const name = config.name.trim();
        if (!name) {
            toast.error('El nombre del tipo de alerta no puede estar vacío.');
            return false;
        }
        if (name.toUpperCase() === SOS_ALERT_TYPE) {
            toast.error('"SOS" es un tipo reservado del sistema.');
            return false;
        }
        if (names.has(name.toLowerCase())) {
            toast.error(`Nombre duplicado: "${name}". Debe ser único.`);
            return false;
        }
        names.add(name.toLowerCase());

        // Renombrar un tipo con alertas abiertas las dejaría huérfanas.
        const original = initialConfigs.find(c => c.id === config.id);
        if (original && original.name !== name) {
            const hasOpen = alerts.some(a =>
                a.type === original.name
                && (a.status === AlertStatus.ACTIVE || a.status === AlertStatus.WORKING)
            );
            if (hasOpen) {
                toast.error(`No puedes renombrar "${original.name}": tiene alertas activas.`);
                return false;
            }
        }
    }
    return true;
  }

  const handleSubmit = async () => {
    if (!validateConfigs()) {
        return;
    }
    setIsSaving(true);
    const finalConfigs = configs.map(c => ({...c, name: c.name.trim()}));
    const success = await updateButtonConfigs(finalConfigs);
    setIsSaving(false);
    if (success) {
      toast.success('Configuration saved successfully.');
    } else {
      toast.error('Failed to save configuration. Your changes were not applied.');
    }
  };
  
  const addEmptyButtonConfig = () => {
    setConfigs([...configs, {
        id: `new-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: `New Alert Type`,
        order: configs.length + 1,
        enabled: true,
        allowedRoles: ['supervisor', 'technical'],
        allowedPressIds: [],
    }]);
  };

  const removeButtonConfig = (index: number) => {
    if (configs.length <= 1) {
        toast.error("There must be at least one alert type.");
        return;
    }
    const newConfigs = configs.filter((_, i) => i !== index);
    setConfigs(newConfigs.map((config, idx) => ({ ...config, order: idx + 1 })));
  };

  const isLoading = loadingConfigs || loadingRoles || loadingPresses || loadingAreas;

  if (isLoading) {
    return <LoadingSpinner message="Loading alert configuration..." />;
  }

  const inputClass = "w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white rounded-md shadow-sm sm:text-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500";

  return (
    <div>
      <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 mb-2">Alert Type Configuration</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Manage alert types, assign them to user roles, and optionally restrict them to specific presses.</p>

      <div className="space-y-4">
        {configs.map((config, index) => {
            const isPressAssignmentExpanded = expandedPressesFor === config.id;
            const assignedPressCount = config.allowedPressIds?.length || 0;
            const allPressesSelected = assignedPressCount === presses.length;

            return (
            <div key={config.id} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800">
                <div className="flex flex-col sm:flex-row items-start gap-4">
                {/* Left Side: Order arrows */}
                <div className="flex sm:flex-col items-center gap-2 sm:gap-0">
                    <button onClick={() => handleOrderChange(index, 'up')} disabled={index === 0} className="p-1 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-50">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" /></svg>
                    </button>
                    <button onClick={() => handleOrderChange(index, 'down')} disabled={index === configs.length - 1} className="p-1 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-50">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                    </button>
                </div>

                {/* Center: Name, Roles, Presses */}
                <div className="flex-grow w-full">
                    <div className="flex items-center gap-4">
                        <div className="flex-grow">
                            <label htmlFor={`name-${index}`} className="sr-only">Alert Type Name</label>
                            <input
                            type="text"
                            id={`name-${index}`}
                            value={config.name}
                            onChange={(e) => handleConfigChange(index, 'name', e.target.value)}
                            className={inputClass}
                            placeholder="Alert Type Name"
                            />
                        </div>
                        <label className="flex items-center space-x-2 whitespace-nowrap">
                            <input
                                type="checkbox"
                                checked={config.enabled}
                                onChange={(e) => handleConfigChange(index, 'enabled', e.target.checked)}
                                className="h-5 w-5 text-primary-600 border-slate-300 dark:border-slate-500 rounded focus:ring-primary-500 bg-white dark:bg-slate-700"
                            />
                            <span className="text-sm text-slate-700 dark:text-slate-300">Enabled</span>
                        </label>
                         <button 
                            onClick={() => removeButtonConfig(index)} 
                            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={configs.length <= 1}
                         >
                            Remove
                        </button>
                    </div>

                    {/* Role Assignment */}
                    <div className="mt-4">
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Visible to Roles:</p>
                        <div className="flex flex-wrap gap-x-6 gap-y-2">
                            {assignableRoles.map(role => (
                                <label key={role.id} className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        checked={config.allowedRoles?.includes(role.id) || false}
                                        onChange={(e) => handleRoleChange(index, role.id, e.target.checked)}
                                        className="h-4 w-4 text-primary-600 border-slate-300 dark:border-slate-500 rounded focus:ring-primary-500 bg-white dark:bg-slate-700"
                                    />
                                    <span className="text-sm text-slate-700 dark:text-slate-300">{role.displayName}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    
                    {/* Press Assignment */}
                    <div className="mt-4">
                        <button onClick={() => setExpandedPressesFor(isPressAssignmentExpanded ? null : config.id)} className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium flex items-center">
                             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={`w-4 h-4 mr-2 transition-transform ${isPressAssignmentExpanded ? 'rotate-90' : ''}`}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                             Manage Press Assignment ({assignedPressCount === 0 ? 'All Presses' : `${assignedPressCount} Specific Presses`})
                        </button>
                        {isPressAssignmentExpanded && (
                            <div className="mt-2 p-3 border border-slate-200 dark:border-slate-700 rounded-md bg-slate-50 dark:bg-slate-900 max-h-60 overflow-y-auto">
                                <div className="flex justify-between items-center mb-2">
                                     <p className="text-xs text-slate-500 dark:text-slate-400">If no presses are selected, the button appears on all.</p>
                                     <label className="flex items-center space-x-2 text-sm font-medium text-slate-700 dark:text-slate-300">
                                        <input
                                            type="checkbox"
                                            checked={allPressesSelected}
                                            onChange={(e) => handleToggleAllPresses(index, e.target.checked)}
                                            className="h-4 w-4 text-primary-600 border-slate-300 dark:border-slate-500 rounded focus:ring-primary-500 bg-white dark:bg-slate-700"
                                        />
                                        <span>Select All</span>
                                     </label>
                                </div>
                               {pressesByArea.map(({areaId, areaName, presses: areaPresses}) => (
                                   <div key={areaId} className="mb-2">
                                       <p className="font-semibold text-sm text-slate-700 dark:text-slate-200 sticky top-0 bg-slate-50 dark:bg-slate-900 py-1">{areaName}</p>
                                        <div className="pl-2 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1">
                                            {areaPresses.map(press => (
                                                <label key={press.id} className="flex items-center space-x-2 p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        checked={config.allowedPressIds?.includes(press.id) || false}
                                                        onChange={(e) => handlePressAssignmentChange(index, press.id, e.target.checked)}
                                                        className="h-4 w-4 text-primary-600 border-slate-300 dark:border-slate-500 rounded focus:ring-primary-500 bg-white dark:bg-slate-700"
                                                    />
                                                    <span className="text-sm text-slate-700 dark:text-slate-300 truncate" title={press.name}>{press.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                   </div>
                               ))}
                            </div>
                        )}
                    </div>
                </div>
                </div>
            </div>
            )
        })}
      </div>
      <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
        <button
            onClick={addEmptyButtonConfig}
            className="w-full sm:w-auto bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-slate-800 dark:text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-colors"
        >
            Add Alert Type
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSaving}
          className="w-full sm:w-auto bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition-colors disabled:opacity-70"
        >
          {isSaving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    </div>
  );
};

export default AlertConfigForm;