import { ClipboardEvent, ClipboardEventListener } from '@/types/clipboard';

class ClipboardEventEmitter {
  private listeners = new Set<ClipboardEventListener>();

  subscribe(listener: ClipboardEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(event: ClipboardEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}

export const clipboardEvents = new ClipboardEventEmitter();
