import React, { useMemo, useState } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useAlerts } from '../hooks/useAlerts';
import { useAlertConfig } from '../hooks/useAlertConfig';
import { useNotifications } from '../hooks/useNotifications';
import { useWakeLock } from '../hooks/useWakeLock';
import WatchAlertCard from '../components/WatchAlertCard';
import LoadingSpinner from '../components/LoadingSpinner';
import UserSelectorScreen from '../components/UserSelectorScreen';
import { AlertStatus, SOS_ALERT_TYPE, User } from '../types';
import { BellIcon, BellSlashIcon, ForkliftIcon, WrenchScrewdriverIcon, UserGroupIcon } from '../constants';

export type WatchRole = 'driver' | 'technical' | 'supervisor';

const ROLE_CONFIG: Record<WatchRole, {
  title: string;
  selectorTitle: string;
  emptyMessage: string;
  icon: React.ReactNode;
}> = {
  driver: {
    title: 'Driver Panel',
    selectorTitle: 'Driver Panel (Watch)',
    emptyMessage: 'You have no assigned alerts.',
    icon: <ForkliftIcon className="w-8 h-8" />,
  },
  technical: {
    title: 'Technician Panel',
    selectorTitle: 'Technician Panel (Watch)',
    emptyMessage: 'No active alerts.',
    icon: <WrenchScrewdriverIcon className="w-8 h-8" />,
  },
  supervisor: {
    title: 'Supervisor Panel',
    selectorTitle: 'Supervisor Panel (Watch)',
    emptyMessage: 'No active alerts.',
    icon: <UserGroupIcon className="w-8 h-8" />,
  },
};

interface WatchDashboardProps {
  role: WatchRole;
}

const WatchDashboard: React.FC<WatchDashboardProps> = ({ role }) => {
  const config = ROLE_CONFIG[role];
  const navigate = ReactRouterDOM.useNavigate();

  // Supervisor is an authenticated role; driver/technical pick their name on-device
  const isAuthRole = role === 'supervisor';
  const { user: authUser, logout } = useAuth();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const actor: User | null = isAuthRole ? authUser : selectedUser;

  const { alerts, loadingAlerts, isConnected } = useAlerts();
  const { buttonConfigs, loadingConfigs } = useAlertConfig();

  const assignedPressIds = useMemo(() => new Set(actor?.assignedPressIds || []), [actor]);

  // Oldest first: the longest-waiting alert demands attention first.
  // SOS bypasses role and press filters: everyone must see it.
  const relevantAlerts = useMemo(() => alerts.filter(alert => {
    const isSos = alert.type === SOS_ALERT_TYPE;
    // Una alerta abierta se muestra siempre; la config solo limita la creación.
    return (isSos || role !== 'driver' || assignedPressIds.has(alert.pressId))
      && (alert.status === AlertStatus.ACTIVE || alert.status === AlertStatus.WORKING);
  }).sort((a, b) => a.timestamp - b.timestamp), [alerts, assignedPressIds, role]);

  const { isMuted, toggleMute } = useNotifications(relevantAlerts, 'vibration');
  useWakeLock(relevantAlerts.length > 0);

  const handleExit = () => {
    if (isAuthRole) {
      logout();
      navigate('/');
    } else {
      setSelectedUser(null);
    }
  };

  if (!actor) {
    if (isAuthRole) {
      // ProtectedRoute redirects, this is just a fallback
      return <div className="bg-black min-h-screen flex items-center justify-center"><LoadingSpinner message="Authenticating..." /></div>;
    }
    return (
      <UserSelectorScreen
        role={role}
        onUserSelect={setSelectedUser}
        title={config.selectorTitle}
        icon={config.icon}
      />
    );
  }

  const isLoading = loadingAlerts || loadingConfigs;

  return (
    <div className="min-h-screen bg-black text-white p-2">
      <header className="flex justify-between items-center mb-3">
        <div className="font-bold">
            <p className="text-lg">{actor.username}</p>
            <p className="text-xs text-gray-400">{config.title}</p>
        </div>
        <div className="flex items-center gap-2">
            <span
                className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}
                title={isConnected ? 'Connected' : 'Connection lost'}
            />
            {!isConnected && <span className="text-xs text-red-400 font-semibold">Offline</span>}
            <button
                onClick={toggleMute}
                className="p-2 rounded-full bg-gray-800"
                title={isMuted ? 'Activate Vibration' : 'Mute'}
            >
                {isMuted ? <BellSlashIcon className="w-5 h-5 text-gray-400"/> : <BellIcon className="w-5 h-5 text-primary-400"/>}
            </button>
            <button onClick={handleExit} className="text-xs bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded-md">Exit</button>
        </div>
      </header>

      <main className="space-y-2">
        {isLoading && <LoadingSpinner message="Loading..." />}

        {!isLoading && relevantAlerts.length === 0 && (
          <p className="text-center text-gray-400 py-10">{config.emptyMessage}</p>
        )}

        {!isLoading && relevantAlerts.length > 0 && (
            relevantAlerts.map(alert => (
                <WatchAlertCard key={alert.id} alert={alert} actor={actor} />
            ))
        )}
      </main>
    </div>
  );
};

export default WatchDashboard;
