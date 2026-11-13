import React from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import HomePage from './pages/HomePage';
import AdminDashboard from './pages/AdminDashboard';
import SupervisorDashboard from './pages/SupervisorDashboard';
import TechnicalDashboard from './pages/TechnicalDashboard';
import DriverDashboard from './pages/DriverDashboard';
import PressDashboard from './pages/PressDashboard';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import { useAuth } from './hooks/useAuth';

import WatchDashboard from './pages/WatchDashboard';
import SosAlarmBanner from './components/SosAlarmBanner';
import DataStateBanner from './components/DataStateBanner';
import AudioStatusBadge from './components/AudioStatusBadge';

const { HashRouter, Routes, Route, Navigate, Outlet, useLocation } = ReactRouterDOM;

const ProtectedRoute: React.FC<{ allowedRoles: string[] }> = ({ allowedRoles }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  const isWatchView = location.pathname.endsWith('-watch');

  if (loading) {
    return (
        <div className="flex justify-center items-center h-screen bg-slate-100 dark:bg-slate-900">
             <div className="w-10 h-10 rounded-full border-4 border-slate-200 dark:border-slate-700 border-t-primary-600 animate-spin"></div>
        </div>
    );
  }

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (isWatchView) {
      return <Outlet />;
  }
  
  // Dashboard Layout for Admin/Supervisor (fullwidth, no sidebar)
  if (user.role === 'admin' || user.role === 'supervisor') {
      return (
         <div className="h-screen bg-slate-100 dark:bg-slate-900 overflow-hidden">
            <main className="h-full overflow-y-auto p-4 md:p-6 lg:p-8">
                <Outlet />
            </main>
        </div>
      )
  }

  // Layout for other roles (Header + Content)
  return (
    <div className="min-h-screen flex flex-col bg-slate-100 dark:bg-slate-900">
      <main className="flex-grow p-4 md:p-6 w-full max-w-7xl mx-auto">
        <Outlet />
      </main>
    </div>
  );
};

const DirectAccessRoute: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-100 dark:bg-slate-900">
      <main className="flex-grow">
        <Outlet />
      </main>
    </div>
  );
};


const App: React.FC = () => {
  return (
    <HashRouter>
      <SosAlarmBanner />
      <DataStateBanner />
      <AudioStatusBadge />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Authenticated Routes */}
        <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
          <Route path="/admin" element={<AdminDashboard />} />
        </Route>
        <Route element={<ProtectedRoute allowedRoles={['supervisor']} />}>
          <Route path="/supervisor" element={<SupervisorDashboard />} />
          
          <Route path="/supervisor-watch" element={<WatchDashboard role="supervisor" />} />
        </Route>
        
        {/* Direct Access Routes */}
        <Route element={<DirectAccessRoute />}>
          <Route path="/driver" element={<DriverDashboard />} />
          <Route path="/press" element={<PressDashboard />} />
          <Route path="/technical" element={<TechnicalDashboard />} />
          <Route path="/technical-watch" element={<WatchDashboard role="technical" />} />
          <Route path="/driver-watch" element={<WatchDashboard role="driver" />} />
        </Route>
        
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </HashRouter>
  );
};

export default App;