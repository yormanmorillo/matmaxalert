import React, { useState, useMemo } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { useUsers } from '../hooks/useUsers';
import { useShifts } from '../hooks/useShifts';
import { User } from '../types';
import LoadingSpinner from './LoadingSpinner';

interface UserSelectorScreenProps {
  role: string;
  onUserSelect: (user: User) => void;
  title: string;
  icon: React.ReactNode;
}

const UserSelectorScreen: React.FC<UserSelectorScreenProps> = ({ role, onUserSelect, title, icon }) => {
  const navigate = ReactRouterDOM.useNavigate();
  const { users, loadingUsers } = useUsers();
  const { shifts, loadingShifts } = useShifts();
  
  const [selectedShiftId, setSelectedShiftId] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');

  const relevantUsers = useMemo(() => users.filter(u => u.role === role), [users, role]);
  
  const usersInShift = useMemo(() => {
    if (!selectedShiftId) return [];
    return relevantUsers.filter(u => u.shiftId === selectedShiftId);
  }, [relevantUsers, selectedShiftId]);

  const handleContinue = () => {
    const selectedUser = relevantUsers.find(u => u.id === selectedUserId);
    if (selectedUser) {
      onUserSelect(selectedUser);
    }
  };

  const isLoading = loadingUsers || loadingShifts;

  const selectClass = "w-full px-3.5 py-2.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors appearance-none";

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900 p-4">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-lg shadow-md w-full max-w-md border border-slate-200 dark:border-slate-700">
        <header className="text-center mb-8">
          <div className="flex items-center justify-center w-14 h-14 bg-slate-100 dark:bg-slate-700 text-primary-600 dark:text-primary-400 rounded-lg mb-4 mx-auto">
            {icon}
          </div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{title}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">Identifícate para continuar.</p>
        </header>

        {isLoading ? <LoadingSpinner message="Cargando datos del equipo..." /> : (
          <div className="space-y-5">
            <div>
              <label htmlFor="shift-selector" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                1. Selecciona tu turno
              </label>
              <select
                id="shift-selector"
                value={selectedShiftId}
                onChange={(e) => {
                  setSelectedShiftId(e.target.value);
                  setSelectedUserId('');
                }}
                className={selectClass}
              >
                <option value="" disabled>Elige un turno</option>
                {shifts.map(shift => (
                  <option key={shift.id} value={shift.id}>{shift.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="user-selector" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                2. Selecciona tu nombre
              </label>
              <select
                id="user-selector"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                disabled={!selectedShiftId || usersInShift.length === 0}
                className={`${selectClass} disabled:opacity-50`}
              >
                <option value="" disabled>Elige tu nombre</option>
                {usersInShift.length > 0 ? (
                  usersInShift.map(user => (
                    <option key={user.id} value={user.id}>{user.username}</option>
                  ))
                ) : (
                  <option disabled>No hay usuarios en este turno</option>
                )}
              </select>
            </div>

            <button
              onClick={handleContinue}
              disabled={!selectedUserId}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2.5 px-4 rounded-md transition-colors disabled:opacity-50"
            >
              Entrar al panel
            </button>
          </div>
        )}

        <button onClick={() => navigate('/')} className="w-full mt-5 text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 font-medium text-sm transition-colors">
            ← Volver a la selección
        </button>
      </div>
    </div>
  );
};

export default UserSelectorScreen;