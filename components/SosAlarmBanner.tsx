import React from 'react';
import { useSosAlarm } from '../hooks/useSosAlarm';
import { usePresses } from '../hooks/usePresses';
import { useAreas } from '../hooks/useAreas';
import { ExclamationTriangleIcon } from '../constants';

/**
 * Global emergency banner: rendered once in App, visible on every panel/route
 * while an SOS alert is unresolved. The siren is driven by useSosAlarm.
 */
const SosAlarmBanner: React.FC = () => {
  const { activeSos, activeSosList, isSilenced, silence } = useSosAlarm();
  const { presses } = usePresses();
  const { areas } = useAreas();

  if (!activeSos) return null;

  const press = presses.find(p => String(p.id) === String(activeSos.pressId));
  const pressName = activeSos.pressName || press?.name || activeSos.pressId;
  const area = areas.find(a => String(a.id) === String(press?.areaId));
  const areaName = activeSos.areaName || area?.name || '';
  const extraSos = activeSosList.length - 1;

  return (
    <>
      {/* Spacer: el banner es fixed y no debe tapar los controles superiores */}
      <div className="h-16" aria-hidden="true" />
      <div
        role="alert"
        aria-live="assertive"
        className="fixed top-0 inset-x-0 z-[100] bg-red-600 text-white shadow-2xl"
      >
        <div className="flex items-center justify-between gap-3 px-4 py-3 max-w-7xl mx-auto">
          <div className="flex items-center gap-3 min-w-0">
            <ExclamationTriangleIcon className="w-9 h-9 flex-shrink-0 animate-pulse" />
            <div className="min-w-0">
              <p className="text-lg sm:text-xl font-extrabold uppercase tracking-wider truncate">
                Emergencia — {pressName}
                {extraSos > 0 && (
                  <span className="ml-2 text-sm align-middle bg-white/20 px-2 py-0.5 rounded">
                    +{extraSos} más
                  </span>
                )}
              </p>
              <p className="text-xs sm:text-sm opacity-90 truncate">
                {areaName}{areaName ? ' · ' : ''}
                {new Date(activeSos.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
            </div>
          </div>
          {!isSilenced && (
            <button
              type="button"
              onClick={silence}
              className="flex-shrink-0 px-3 py-2 bg-white/20 hover:bg-white/30 border border-white/40 rounded-md text-xs sm:text-sm font-bold uppercase tracking-wide transition-colors"
            >
              Silenciar
            </button>
          )}
        </div>
      </div>
    </>
  );
};

export default SosAlarmBanner;
