import { DerivedKeyPair } from '@/types/encryption';

class SessionManager {
  private keys: DerivedKeyPair | null = null;
  private lastActivityAt: number | null = null;

  start(keys: DerivedKeyPair): void {
    this.keys = keys;
    this.lastActivityAt = Date.now();
  }

  end(): void {
    this.keys = null;
    this.lastActivityAt = null;
  }

  isUnlocked(): boolean {
    return this.keys !== null;
  }

  getKeys(): DerivedKeyPair | null {
    return this.keys;
  }

  touch(): void {
    if (this.keys !== null) {
      this.lastActivityAt = Date.now();
    }
  }

  idleTimeMs(): number | null {
    if (this.lastActivityAt === null) return null;
    return Date.now() - this.lastActivityAt;
  }
}

export const sessionManager = new SessionManager();
