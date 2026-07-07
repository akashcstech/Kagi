/** 0 = Very Weak ... 4 = Very Strong. */
export type PasswordStrengthScore = 0 | 1 | 2 | 3 | 4;

export interface PasswordStrength {
  score: PasswordStrengthScore;
  label: 'Very Weak' | 'Weak' | 'Fair' | 'Strong' | 'Very Strong';
  suggestions: string[];
}

export class VaultAlreadyInitializedError extends Error {
  constructor() {
    super('A vault already exists on this device. Use login instead of setup.');
    this.name = 'VaultAlreadyInitializedError';
  }
}

export class VaultNotInitializedError extends Error {
  constructor() {
    super('No vault has been set up on this device yet.');
    this.name = 'VaultNotInitializedError';
  }
}

export class WrongPasswordError extends Error {
  constructor(message = 'Incorrect master password.') {
    super(message);
    this.name = 'WrongPasswordError';
  }
}

export class SessionLockedError extends Error {
  constructor(message = 'The vault is locked. Please unlock it first.') {
    super(message);
    this.name = 'SessionLockedError';
  }
}
