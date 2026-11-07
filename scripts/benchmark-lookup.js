/**
 * benchmark-lookup.js – Map.get vs Array.find for booking lookup.
 *
 * Run:  npm run benchmark
 *
 * Creates BOOKINGS fake bookings, then looks up LOOKUPS of them by
 * reference.  Map.get is O(1) on average; Array.find is O(n).
 * Doubling BOOKINGS should leave the Map time roughly the same
 * but double the Array time.
 */

import { randomBytes } from 'node:crypto';

// ── configuration ──────────────────────────────────────────────────

const BOOKINGS = 100_000;
const LOOKUPS  = 500;

// ── build fake data ────────────────────────────────────────────────

/** Quick random reference for benchmarking only. */
function fakeRef(i) {
  const bytes = randomBytes(3);
  return `REF-${i}-${bytes.toString('hex')}`;
}

const bookingsArray = [];
const bookingsMap   = new Map();

for (let i = 0; i < BOOKINGS; i++) {
  const ref = fakeRef(i);
  const booking = { id: i, reference: ref, attendeeName: `Person ${i}` };
  bookingsArray.push(booking);
  bookingsMap.set(ref, booking);
}

// Pick LOOKUPS random references to search for.
const targets = [];
for (let i = 0; i < LOOKUPS; i++) {
  const idx = randomBytes(4).readUInt32BE(0) % BOOKINGS;
  targets.push(bookingsArray[idx].reference);
}

// ── benchmark Array.find ───────────────────────────────────────────

const arrayStart = performance.now();
for (const ref of targets) {
  bookingsArray.find((b) => b.reference === ref);
}
const arrayMs = performance.now() - arrayStart;

// ── benchmark Map.get ──────────────────────────────────────────────

const mapStart = performance.now();
for (const ref of targets) {
  bookingsMap.get(ref);
}
const mapMs = performance.now() - mapStart;

// ── results ────────────────────────────────────────────────────────

console.log(`\nBenchmark: look up ${LOOKUPS} bookings among ${BOOKINGS.toLocaleString()}\n`);
console.log(`  Array.find : ${arrayMs.toFixed(2)} ms`);
console.log(`  Map.get    : ${mapMs.toFixed(2)} ms`);
console.log(`  Speed-up   : ${(arrayMs / mapMs).toFixed(1)}×\n`);
console.log(
  'Why?  Map.get is O(1) average (hash table).  Array.find is O(n) – it scans',
);
console.log(
  'from the start on every call.  Double BOOKINGS and the Array time roughly',
);
console.log('doubles while the Map time stays flat.\n');
