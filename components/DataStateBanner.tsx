import React from 'react';
import { useAlerts } from '../hooks/useAlerts';

/**
 * Aviso global cuando las alertas no se pudieron cargar o se perdió el
 * tiempo real. Evita que un fallo de red se vea como "planta sana".
 */
const DataStateBanner: React.FC = () => {
  const { error, refreshAlerts, loadingAlerts } = useAlerts();

  if (!error) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-50 bg-red-600 text-white text-sm font-semibold px-4 py-2 flex items-center justify-between gap-3"
    >
      <span className="truncate">⚠ {error}</span>
      <button
        type="button"
        onClick={refreshAlerts}
        disabled={loadingAlerts}
        className="flex-shrink-0 px-3 py-1 rounded border border-white/50 hover:bg-white/15 disabled:opacity-60"
      >
        {loadingAlerts ? 'Reintentando…' : 'Reintentar'}
      </button>
    </div>
  );
};

export default DataStateBanner;
