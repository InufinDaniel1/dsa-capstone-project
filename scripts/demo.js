/**
 * demo.js – tells the whole Build 1 story.
 *
 * Run:  npm run demo
 */

import {
  createStore,
  createEvent,
  addTier,
  bookTickets,
  cancelBooking,
  findBookingByReference,
  joinWaitlist,
} from '../src/domain/inventory.js';

const store = createStore();

// ── 1. Create an event with one tier of 3 seats ────────────────────

const event = createEvent(store, {
  name: 'DSA Live Conference 2026',
  date: '2026-12-15',
});

const tier = addTier(store, {
  eventId: event.id,
  name: 'General Admission',
  priceInCents: 4500,   // ₦45.00 stored as whole cents / kobo
  capacity: 3,
});

console.log(`\n🎫  Event created: "${event.name}" on ${event.date}`);
console.log(`    Tier: ${tier.name} – ${tier.capacity} seats at ${tier.priceInCents} cents each\n`);

// ── 2. Ada books 2 of the 3 seats ──────────────────────────────────

const adaBooking = bookTickets(store, {
  eventId: event.id,
  tierId: tier.id,
  attendeeName: 'Ada',
  quantity: 2,
});

console.log(`✅  Ada booked ${adaBooking.quantity} ticket(s). Ref: ${adaBooking.reference}`);
console.log(`    Total: ${adaBooking.totalCents} cents.  Seats left: ${tier.capacity - tier.sold}\n`);

// ── 3. Bayo tries to book 2 but only 1 is left → SOLD_OUT ─────────

try {
  bookTickets(store, {
    eventId: event.id,
    tierId: tier.id,
    attendeeName: 'Bayo',
    quantity: 2,
  });
} catch (err) {
  console.log(`❌  Bayo's booking refused: [${err.code}] ${err.message}`);
}

// ── 4. Chika takes the last seat → event is sold out ───────────────

const chikaBooking = bookTickets(store, {
  eventId: event.id,
  tierId: tier.id,
  attendeeName: 'Chika',
  quantity: 1,
});

console.log(`✅  Chika booked ${chikaBooking.quantity} ticket(s). Ref: ${chikaBooking.reference}`);
console.log(`    Seats left: ${tier.capacity - tier.sold} – SOLD OUT!\n`);

// ── 5. Two people join the waitlist ────────────────────────────────

joinWaitlist(store, { eventId: event.id, attendeeName: 'Dayo' });
joinWaitlist(store, { eventId: event.id, attendeeName: 'Emeka' });
console.log(`⏳  Dayo and Emeka joined the waitlist (${event.waitlist.size} in queue).\n`);

// ── 6. Look up Ada's booking by reference (O(1) Map lookup) ───────

const found = findBookingByReference(store, { reference: adaBooking.reference });
console.log(`🔍  Looked up booking by reference "${found.reference}": ${found.attendeeName}, ${found.quantity} ticket(s).\n`);

// ── 7. Ada cancels – seats are released ────────────────────────────

cancelBooking(store, { bookingId: adaBooking.id });
console.log(`🗑️   Ada's booking cancelled. Seats left: ${tier.capacity - tier.sold}`);

// ── 8. Cancelling again is an error ────────────────────────────────

try {
  cancelBooking(store, { bookingId: adaBooking.id });
} catch (err) {
  console.log(`❌  Cancelling again: [${err.code}] ${err.message}`);
}

// ── 9. Next person in line ─────────────────────────────────────────

const next = event.waitlist.peek();
console.log(`\n📢  Next in line from the waitlist: ${next.attendeeName}`);
console.log('');
