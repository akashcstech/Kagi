export type AutoLockDuration = 1 | 5 | 15 | 'never';

export const AUTO_LOCK_OPTIONS: AutoLockDuration[] = [1, 5, 15, 'never'];

export const DEFAULT_AUTO_LOCK_DURATION: AutoLockDuration = 5;

export const AUTO_LOCK_SETTING_KEY = 'auto_lock_duration';
