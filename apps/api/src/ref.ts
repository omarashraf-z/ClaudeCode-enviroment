import { randomInt } from 'node:crypto';

/* No 0/O/1/I/L — these get read out over a loud PA and typed by a person
   with a stamp on their hand. */
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

export function makeRef(): string {
  const block = (n: number) =>
    Array.from({ length: n }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
  return `GB-${block(4)}-${block(4)}`;
}

export function normaliseRef(input: string): string {
  const cleaned = input.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const body = cleaned.startsWith('GB') ? cleaned.slice(2) : cleaned;
  return body.length === 8 ? `GB-${body.slice(0, 4)}-${body.slice(4)}` : input.trim().toUpperCase();
}
