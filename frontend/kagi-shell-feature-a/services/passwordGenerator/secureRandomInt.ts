import * as Crypto from 'expo-crypto';

export async function secureRandomInt(maxExclusive: number): Promise<number> {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0 || maxExclusive > 256) {
    throw new RangeError('secureRandomInt supports maxExclusive in the range 1–256.');
  }

  const limit = Math.floor(256 / maxExclusive) * maxExclusive;

  while (true) {
    const bytes = await Crypto.getRandomBytesAsync(1);
    const byte = bytes[0];
    if (byte < limit) {
      return byte % maxExclusive;
    }
  }
}

export async function secureShuffle<T>(items: T[]): Promise<T[]> {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = await secureRandomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
