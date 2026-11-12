import { useEffect } from 'react';

/**
 * Keeps the screen on while `active` is true (e.g. there are pending alerts).
 * Re-acquires the lock when the tab becomes visible again.
 * Silently no-ops on unsupported browsers or when permission is denied.
 */
export const useWakeLock = (active: boolean) => {
  useEffect(() => {
    if (!active) return;
    if (!('wakeLock' in navigator)) return;

    let sentinel: WakeLockSentinel | null = null;
    let released = false;

    const request = async () => {
      try {
        sentinel = await navigator.wakeLock.request('screen');
      } catch {
        // Denied or not visible — will retry on next visibilitychange
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !released) {
        request();
      }
    };

    request();
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      released = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      sentinel?.release().catch(() => {});
    };
  }, [active]);
};
