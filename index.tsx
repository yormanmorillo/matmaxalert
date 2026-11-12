import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { AlertProvider } from './contexts/AlertContext';
import { PressProvider } from './contexts/PressContext';
import { UserProvider } from './contexts/UserContext';
import { AlertConfigProvider } from './contexts/AlertConfigContext';
import { ShiftProvider } from './contexts/ShiftContext';
import { RoleProvider } from './contexts/RoleContext';
import { AreaProvider } from './contexts/AreaContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';
import { unlockAudio } from './services/notificationService';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <RoleProvider>
            <AreaProvider>
              <ShiftProvider>
                <UserProvider>
                  <PressProvider>
                    <AlertConfigProvider>
                      <AlertProvider>
                        <App />
                        <Toaster position="bottom-right" toastOptions={{ duration: 4000, style: { background: '#1E293B', color: '#fff' } }} />
                      </AlertProvider>
                    </AlertConfigProvider>
                  </PressProvider>
                </UserProvider>
              </ShiftProvider>
            </AreaProvider>
          </RoleProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

// Desbloquear audio en el primer gesto: los navegadores bloquean el autoplay
// y sin esto la sirena del SOS podía no sonar en un kiosko recién abierto.
const unlock = () => {
  unlockAudio();
  window.removeEventListener('pointerdown', unlock);
  window.removeEventListener('keydown', unlock);
};
window.addEventListener('pointerdown', unlock, { once: true });
window.addEventListener('keydown', unlock, { once: true });

// PWA: solo en producción y si el service worker está disponible.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('Service worker no registrado:', err);
    });
  });
}
