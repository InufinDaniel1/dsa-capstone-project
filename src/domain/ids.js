import { randomUUID, randomBytes } from 'node:crypto';

/**
 * Generate a new unique identifier (UUID v4).
 * @returns {string}
 */
export function newId() {
  return randomUUID();
}

/**
 * Generate a short, readable booking reference that is safe to read aloud.
 *
 * Format: 3 upper-case consonants + 3 digits  (e.g. "BKT-472").
 * Consonants avoid look-alike or sound-alike letters (I, O, Q, S, Z).
 * This gives roughly 10^6 combinations – plenty for an in-memory demo;
 * collisions are checked by the caller (inventory.js).
 *
 * Uses node:crypto for randomness, never Math.random().
 *
 * @returns {string}
 */
export function newReference() {
  // Consonants minus ambiguous letters (I/1, O/0, Q/O, S/5, Z/2)
  const consonants = 'BCDFGHJKLMNPRTVWXY';
  const bytes = randomBytes(6);

  const c1 = consonants[bytes[0] % consonants.length];
  const c2 = consonants[bytes[1] % consonants.length];
  const c3 = consonants[bytes[2] % consonants.length];

  const d1 = bytes[3] % 10;
  const d2 = bytes[4] % 10;
  const d3 = bytes[5] % 10;

  return `${c1}${c2}${c3}-${d1}${d2}${d3}`;
}
