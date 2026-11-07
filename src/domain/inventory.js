import { DomainError } from './errors.js';
import { newId, newReference } from './ids.js';
import { Queue } from './waitlistQueue.js';

// ─── helpers ────────────────────────────────────────────────────────

/**
 * Validate that `value` is a non-empty trimmed string.
 * @param {*} value
 * @param {string} label  Name shown in the error message.
 * @returns {string}  The trimmed string.
 */
function requireString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new DomainError('VALIDATION', `${label} must be a non-empty string.`);
  }
  return value.trim();
}

/**
 * Validate that `value` is a safe positive integer.
 * @param {*} value
 * @param {string} label
 * @returns {number}
 */
function requirePositiveInt(value, label) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new DomainError('VALIDATION', `${label} must be a positive integer.`);
  }
  return value;
}

/**
 * Validate that `value` is a safe non-negative integer (for money in cents).
 * @param {*} value
 * @param {string} label
 * @returns {number}
 */
function requireNonNegativeInt(value, label) {
  if (!Number.isInteger(value) || value < 0) {
    throw new DomainError('VALIDATION', `${label} must be a non-negative integer (cents).`);
  }
  return value;
}

// ─── store factory ──────────────────────────────────────────────────

/**
 * Create a fresh in-memory store.
 *
 * The store is a plain object that holds all state:
 *   events     – Map<eventId, event>
 *   bookings   – Map<bookingId, booking>
 *   references – Map<reference, booking>   (O(1) lookup by reference)
 *
 * @returns {object}
 */
export function createStore() {
  return {
    events: new Map(),
    bookings: new Map(),
    references: new Map(),
  };
}

// ─── createEvent ────────────────────────────────────────────────────

/**
 * Create a new event and add it to the store.
 *
 * @param {object} store
 * @param {{ name: string, date: string }} params
 * @returns {object}  The created event.
 */
export function createEvent(store, { name, date }) {
  name = requireString(name, 'Event name');
  date = requireString(date, 'Event date');

  const event = {
    id: newId(),
    name,
    date,
    tiers: [],
    waitlist: new Queue(),
  };

  store.events.set(event.id, event);
  return event;
}

// ─── addTier ────────────────────────────────────────────────────────

/**
 * Add a ticket tier to an existing event.
 *
 * @param {object} store
 * @param {{ eventId: string, name: string, priceInCents: number, capacity: number }} params
 * @returns {object}  The created tier.
 */
export function addTier(store, { eventId, name, priceInCents, capacity }) {
  eventId = requireString(eventId, 'Event ID');
  name = requireString(name, 'Tier name');
  priceInCents = requireNonNegativeInt(priceInCents, 'Price');
  capacity = requirePositiveInt(capacity, 'Capacity');

  const event = store.events.get(eventId);
  if (!event) {
    throw new DomainError('NOT_FOUND', `Event ${eventId} does not exist.`);
  }

  const tier = {
    id: newId(),
    eventId,
    name,
    priceInCents,
    capacity,
    sold: 0,
  };

  event.tiers.push(tier);
  return tier;
}

// ─── bookTickets ────────────────────────────────────────────────────

/**
 * Book tickets from a tier.
 *
 * Rules
 *   - quantity must be 1 … 10.
 *   - If not enough seats remain, throw SOLD_OUT and change nothing.
 *   - A reference is generated that is unique across the store.
 *
 * @param {object} store
 * @param {{ eventId: string, tierId: string, attendeeName: string, quantity: number }} params
 * @returns {object}  The created booking.
 */
export function bookTickets(store, { eventId, tierId, attendeeName, quantity }) {
  eventId = requireString(eventId, 'Event ID');
  tierId = requireString(tierId, 'Tier ID');
  attendeeName = requireString(attendeeName, 'Attendee name');

  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
    throw new DomainError('VALIDATION', 'Quantity must be an integer between 1 and 10.');
  }

  const event = store.events.get(eventId);
  if (!event) {
    throw new DomainError('NOT_FOUND', `Event ${eventId} does not exist.`);
  }

  const tier = event.tiers.find((t) => t.id === tierId);
  if (!tier) {
    throw new DomainError('NOT_FOUND', `Tier ${tierId} does not exist in event ${eventId}.`);
  }

  const seatsLeft = tier.capacity - tier.sold;
  if (quantity > seatsLeft) {
    // Failed booking must not change anything – we throw before mutating.
    throw new DomainError(
      'SOLD_OUT',
      `Not enough seats: ${seatsLeft} left, ${quantity} requested.`,
    );
  }

  // Generate a unique reference (retry on the rare collision).
  let reference;
  do {
    reference = newReference();
  } while (store.references.has(reference));

  // Only mutate state after all checks have passed.
  tier.sold += quantity;

  const booking = {
    id: newId(),
    reference,
    eventId,
    tierId,
    attendeeName,
    quantity,
    totalCents: tier.priceInCents * quantity,
    cancelled: false,
  };

  store.bookings.set(booking.id, booking);
  store.references.set(reference, booking);

  return booking;
}

// ─── cancelBooking ──────────────────────────────────────────────────

/**
 * Cancel a booking and release its seats.
 *
 * Cancelling the same booking twice throws CONFLICT.
 *
 * @param {object} store
 * @param {{ bookingId: string }} params
 * @returns {object}  The cancelled booking.
 */
export function cancelBooking(store, { bookingId }) {
  bookingId = requireString(bookingId, 'Booking ID');

  const booking = store.bookings.get(bookingId);
  if (!booking) {
    throw new DomainError('NOT_FOUND', `Booking ${bookingId} does not exist.`);
  }

  if (booking.cancelled) {
    throw new DomainError('CONFLICT', `Booking ${bookingId} is already cancelled.`);
  }

  const event = store.events.get(booking.eventId);
  const tier = event.tiers.find((t) => t.id === booking.tierId);

  // Release the seats.
  tier.sold -= booking.quantity;
  booking.cancelled = true;

  return booking;
}

// ─── findBookingByReference ─────────────────────────────────────────

/**
 * Look up a booking by its short reference code.  O(1) via Map.
 *
 * @param {object} store
 * @param {{ reference: string }} params
 * @returns {object}  The matching booking.
 */
export function findBookingByReference(store, { reference }) {
  reference = requireString(reference, 'Reference');

  const booking = store.references.get(reference);
  if (!booking) {
    throw new DomainError('NOT_FOUND', `No booking found with reference "${reference}".`);
  }
  return booking;
}

// ─── joinWaitlist ───────────────────────────────────────────────────

/**
 * Add an attendee to the waitlist for an event.
 *
 * @param {object} store
 * @param {{ eventId: string, attendeeName: string }} params
 */
export function joinWaitlist(store, { eventId, attendeeName }) {
  eventId = requireString(eventId, 'Event ID');
  attendeeName = requireString(attendeeName, 'Attendee name');

  const event = store.events.get(eventId);
  if (!event) {
    throw new DomainError('NOT_FOUND', `Event ${eventId} does not exist.`);
  }

  event.waitlist.enqueue({ attendeeName, joinedAt: new Date().toISOString() });
}
