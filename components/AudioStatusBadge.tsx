import React, { useEffect, useState } from 'react';
import { getAudioState, unlockAudio } from '../services/notificationService';

/**
 * Indicador honesto del estado del audio. En un televisor de pared nadie
 * toca la pantalla: si el navegador bloquea el autoplay, aquí se ve y se
 * puede activar con un toque (o con la política de kiosko de Chrome).
 */
const AudioStatusBadge: React.FC = () => {
  const [state, setState] = useState<'unlocked' | 'locked' | 'unsupported'>(() => getAudioState());

  useEffect(() => {
    const intervalId = window.setInterval(() => setState(getAudioState()), 2000);
    return () => window.clearInterval(intervalId);
  }, []);

  if (state === 'unsupported') return null;

  const activate = async () => {
    const ok = await unlockAudio();
    setState(ok ? 'unlocked' : getAudioState());
  };

  const unlocked = state === 'unlocked';

  return (
    <button
      type="button"
      onClick={activate}
      aria-live="polite"
      title={unlocked ? 'El audio de alertas está activo' : 'Toca para habilitar la sirena y los avisos'}
      className={`fixed bottom-3 left-3 z-40 flex items-center gap-2 px-3 py-2 rounded-full text-xs font-bold shadow-lg border transition-colors ${
        unlocked
          ? 'bg-emerald-600 border-emerald-500 text-white'
          : 'bg-amber-400 border-amber-500 text-amber-950 animate-pulse'
      }`}
    >
      <span aria-hidden="true">{unlocked ? '🔊' : '🔇'}</span>
      {unlocked ? 'Sonido activo' : 'Activar sonido'}
    </button>
  );
};

export default AudioStatusBadge;
