import { create } from 'zustand';

import { isUnlocked as isSessionUnlocked, isVaultInitialized } from '@/services/auth';

export type VaultStatus = 'loading' | 'uninitialized' | 'locked' | 'unlocked';

interface AuthState {
  status: VaultStatus;
  /** Re-derives status from the auth service. Call after any change that might affect it. */
  refresh: () => Promise<void>;
  /** Call right after setupMasterPassword() / login() / loginWithBiometrics() succeed. */
  markUnlocked: () => void;
  /** Call right after lock() / logout() / an auto-lock trigger. */
  markLocked: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'loading',

  refresh: async () => {
    const initialized = await isVaultInitialized();
    if (!initialized) {
      set({ status: 'uninitialized' });
      return;
    }
    set({ status: isSessionUnlocked() ? 'unlocked' : 'locked' });
  },

  markUnlocked: () => set({ status: 'unlocked' }),
  markLocked: () => set({ status: 'locked' }),
}));
