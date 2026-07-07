export {
  getAutoLockDuration,
  setAutoLockDuration,
  touchActivity,
  lockNow,
  checkAndLockIfIdle,
} from './autoLockService';

export type { AutoLockDuration } from '@/types/autoLock';
export { AUTO_LOCK_OPTIONS, DEFAULT_AUTO_LOCK_DURATION } from '@/types/autoLock';
