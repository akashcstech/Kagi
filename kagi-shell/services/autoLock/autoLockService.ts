import { getSetting, setSetting } from '@/database';
import { sessionManager, lock as lockSession, isUnlocked } from '@/services/auth';
import { clearClipboardNow } from '@/services/clipboard';
import { AutoLockDuration, AUTO_LOCK_SETTING_KEY, DEFAULT_AUTO_LOCK_DURATION } from '@/types/autoLock';

function serialize(duration: AutoLockDuration): string {
  return duration === 'never' ? 'never' : String(duration);
}

function deserialize(raw: string | null): AutoLockDuration {
  if (raw === null) return DEFAULT_AUTO_LOCK_DURATION;
  if (raw === 'never') return 'never';
  const parsed = Number(raw);
  return parsed === 1 || parsed === 5 || parsed === 15 ? parsed : DEFAULT_AUTO_LOCK_DURATION;
}

export async function getAutoLockDuration(): Promise<AutoLockDuration> {
  const raw = await getSetting(AUTO_LOCK_SETTING_KEY);
  return deserialize(raw);
}

export async function setAutoLockDuration(duration: AutoLockDuration): Promise<void> {
  await setSetting(AUTO_LOCK_SETTING_KEY, serialize(duration));
}

export function touchActivity(): void {
  sessionManager.touch();
}

export async function lockNow(): Promise<void> {
  lockSession();
  await clearClipboardNow();
}

export async function checkAndLockIfIdle(): Promise<boolean> {
  if (!isUnlocked()) return false;

  const duration = await getAutoLockDuration();
  if (duration === 'never') return false;

  const idleMs = sessionManager.idleTimeMs();
  if (idleMs === null) return false;

  const thresholdMs = duration * 60 * 1_000;
  if (idleMs >= thresholdMs) {
    await lockNow();
    return true;
  }

  return false;
}
