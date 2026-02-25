import bcrypt from 'bcryptjs';
import { randomSelect } from './randomness.helper.js';
export async function validPassword(password: string, hashedPassword: string) {
  return await bcrypt.compare(password, hashedPassword);
}

export async function hashPassword(password: string) {
  return await bcrypt.hash(password, 10);
}

export function passwordGenerator(
  length: number,
  options: {
    includeLowercase?: boolean;
    includeUppercase?: boolean;
    includeSymbols?: boolean;
    includeNumbers?: boolean;
  } = {}
): string {
  const {
    includeLowercase = true,
    includeUppercase = true,
    includeSymbols = true,
    includeNumbers = true,
  } = options;

  const LETTERS_IN_ALPHABET = 26;
  const symbols = ['_', '$', '@', '#'];
  const lowercaseLetters = Array.from({ length: LETTERS_IN_ALPHABET }, (_, i) =>
    String.fromCharCode('a'.charCodeAt(0) + i)
  );
  const uppercaseLetters = Array.from({ length: LETTERS_IN_ALPHABET }, (_, i) =>
    String.fromCharCode('A'.charCodeAt(0) + i)
  );
  const digits = Array.from({ length: 10 }, (_, i) => i.toString());

  const pools: (() => string)[] = [];

  if (includeLowercase) pools.push(() => randomSelect(lowercaseLetters));
  if (includeUppercase) pools.push(() => randomSelect(uppercaseLetters));
  if (includeSymbols) pools.push(() => randomSelect(symbols));
  if (includeNumbers) pools.push(() => randomSelect(digits));

  if (pools.length === 0) return ''; // No character types selected

  const password: string[] = [];
  let poolCycle: (() => string)[] = [];

  while (password.length < length) {
    if (poolCycle.length === 0) poolCycle = [...pools].reverse();
    password.push(poolCycle.pop()!());
  }

  return password.join('');
}
