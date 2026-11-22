import { createHash, randomInt } from 'crypto';

// No 0, O, 1, I or L, so codes are easy to read and type.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** Normalizes user input: "vialz-abcd-…" becomes the 12 bare characters. */
export function canonicalCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^VIALZ/, '');
}

export function hashCode(canonical: string): string {
  return createHash('sha256').update(canonical).digest('hex');
}

/** Creates a new code. Only the hash is stored. The display value is shown once. */
export function generateCode(): { display: string; hash: string } {
  const chars = Array.from({ length: 12 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');
  return {
    display: `VIALZ-${chars.slice(0, 4)}-${chars.slice(4, 8)}-${chars.slice(8)}`,
    hash: hashCode(chars),
  };
}
