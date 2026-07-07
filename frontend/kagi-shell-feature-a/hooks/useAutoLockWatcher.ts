import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

import { checkAndLockIfIdle, touchActivity } from '@/services/autoLock';
import { useAuthStore } from '@/stores/authStore';

const FOREGROUND_CHECK_INTERVAL_MS = 15_000;

/**
 * checkAndLockIfIdle() is pull-based — nothing locks the vault on its own.
 * This hook triggers that check on every foreground transition and on a
 * repeating interval while the app stays foregrounded, and touches
 * activity whenever the app becomes active again.
 */
export function useAutoLockWatcher(): void {
  const markLocked = useAuthStore((s) => s.markLocked);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const stopInterval = () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    const runCheck = async () => {
      const didLock = await checkAndLockIfIdle();
      if (didLock) markLocked();
    };

    const startInterval = () => {
      stopInterval();
      intervalRef.current = setInterval(runCheck, FOREGROUND_CHECK_INTERVAL_MS);
    };

    const handleAppStateChange = (next: AppStateStatus) => {
      if (next === 'active') {
        touchActivity();
        runCheck();
        startInterval();
      } else {
        stopInterval();
      }
    };

    if (AppState.currentState === 'active') {
      startInterval();
    }

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      stopInterval();
      subscription.remove();
    };
  }, [markLocked]);
}
