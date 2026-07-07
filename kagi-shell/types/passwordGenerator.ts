export interface PasswordGeneratorOptions {
  length: number;
  includeUppercase: boolean;
  includeLowercase: boolean;
  includeNumbers: boolean;
  includeSymbols: boolean;
}

export const DEFAULT_PASSWORD_GENERATOR_OPTIONS: PasswordGeneratorOptions = {
  length: 20,
  includeUppercase: true,
  includeLowercase: true,
  includeNumbers: true,
  includeSymbols: true,
};

export class InvalidPasswordLengthError extends Error {
  constructor(min: number, max: number) {
    super(`Password length must be between ${min} and ${max} characters.`);
    this.name = 'InvalidPasswordLengthError';
  }
}

export class NoCharacterSetSelectedError extends Error {
  constructor(message = 'Select at least one character type (uppercase, lowercase, numbers, or symbols).') {
    super(message);
    this.name = 'NoCharacterSetSelectedError';
  }
}
