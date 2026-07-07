import * as Clipboard from 'expo-clipboard';
import { CLIPBOARD_CLEAR_DELAY_MS } from '@/types/clipboard';
import { clipboardEvents } from './clipboardEvents';

let pendingClearTimer: ReturnType<typeof setTimeout> | null = null;
let lastCopiedValue: string | null = null;
let clearAt: number | null = null;

function cancelPendingTimer(): void {
  if (pendingClearTimer !== null) {
    clearTimeout(pendingClearTimer);
    pendingClearTimer = null;
  }
}

async function clearIfStillOurs(): Promise<void> {
  pendingClearTimer = null;

  if (lastCopiedValue === null) return;

  try {
    const current = await Clipboard.getStringAsync();
    if (current === lastCopiedValue) {
      await Clipboard.setStringAsync('');
      clipboardEvents.emit({ type: 'cleared' });
    }
  } finally {
    lastCopiedValue = null;
    clearAt = null;
  }
}

export async function copyToClipboard(value: string, fieldLabel?: string): Promise<void> {
  cancelPendingTimer();

  await Clipboard.setStringAsync(value);
  lastCopiedValue = value;
  clearAt = Date.now() + CLIPBOARD_CLEAR_DELAY_MS;

  clipboardEvents.emit({ type: 'copied', fieldLabel });

  pendingClearTimer = setTimeout(() => {
    void clearIfStillOurs();
  }, CLIPBOARD_CLEAR_DELAY_MS);
}

export async function clearClipboardNow(): Promise<void> {
  cancelPendingTimer();
  await clearIfStillOurs();
}

export function remainingClearMs(): number | null {
  if (clearAt === null) return null;
  return Math.max(0, clearAt - Date.now());
}
