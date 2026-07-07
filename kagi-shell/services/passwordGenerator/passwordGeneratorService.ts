import { CHARSET_UPPERCASE, CHARSET_LOWERCASE, CHARSET_NUMBERS, CHARSET_SYMBOLS } from './charsets';
import { secureRandomInt, secureShuffle } from './secureRandomInt';
import {
  PasswordGeneratorOptions,
  InvalidPasswordLengthError,
  NoCharacterSetSelectedError,
} from '@/types/passwordGenerator';

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 64;

function pickRandomChar(charset: string): Promise<string> {
  return secureRandomInt(charset.length).then((index) => charset[index]);
}

export async function generatePassword(options: PasswordGeneratorOptions): Promise<string> {
  const { length, includeUppercase, includeLowercase, includeNumbers, includeSymbols } = options;

  if (!Number.isInteger(length) || length < MIN_PASSWORD_LENGTH || length > MAX_PASSWORD_LENGTH) {
    throw new InvalidPasswordLengthError(MIN_PASSWORD_LENGTH, MAX_PASSWORD_LENGTH);
  }

  const selectedCharsets: string[] = [];
  if (includeUppercase) selectedCharsets.push(CHARSET_UPPERCASE);
  if (includeLowercase) selectedCharsets.push(CHARSET_LOWERCASE);
  if (includeNumbers) selectedCharsets.push(CHARSET_NUMBERS);
  if (includeSymbols) selectedCharsets.push(CHARSET_SYMBOLS);

  if (selectedCharsets.length === 0) {
    throw new NoCharacterSetSelectedError();
  }

  if (selectedCharsets.length > length) {
    throw new InvalidPasswordLengthError(selectedCharsets.length, MAX_PASSWORD_LENGTH);
  }

  const combinedCharset = selectedCharsets.join('');

  const guaranteedChars = await Promise.all(selectedCharsets.map((set) => pickRandomChar(set)));

  const remainingCount = length - guaranteedChars.length;
  const fillerChars: string[] = [];
  for (let i = 0; i < remainingCount; i += 1) {
    fillerChars.push(await pickRandomChar(combinedCharset));
  }

  const shuffled = await secureShuffle([...guaranteedChars, ...fillerChars]);
  return shuffled.join('');
}
