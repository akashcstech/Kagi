export const CLIPBOARD_CLEAR_DELAY_MS = 30_000;

export type ClipboardEvent =
  | { type: 'copied'; fieldLabel?: string }
  | { type: 'cleared' };

export type ClipboardEventListener = (event: ClipboardEvent) => void;
