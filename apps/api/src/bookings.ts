import type { DB } from './db.js';
import { config } from './config.js';
import { makeRef } from './ref.js';
import { partyRowById, soldFor } from './parties.js';
import type { BookingRow, PartyRow, TierRow } from './types.js';

export class BookingError extends Error {
  constructor(
    message: string,
    readonly code:
      | 'no_party'
      | 'party_closed'
      | 'unknown_tier'
      | 'door_only'
      | 'too_many'
      | 'sold_out'
      | 'not_enough_left'
      | 'at_capacity',
    readonly status = 409
  ) {
    super(message);
    this.name = 'BookingError';
  }
}

export interface CreateBookingInput {
  tierId: number;
  name: string;
  email: string;
  quantity: number;
  /** Injected by the tests; defaults to now. */
  now?: Date;
}

export interface CreatedBooking {
  booking: BookingRow;
  party: PartyRow;
  tier: TierRow;
}

/**
 * Sell tickets.
 *
 * Everything below happens inside one SQLite transaction, and the UPDATE that
 * takes the seats carries its own `quantity - sold >= ?` guard. Two people
 * clicking on the last two tickets at the same millisecond cannot both win:
 * the second UPDATE matches no rows and the whole transaction rolls back.
 */
export function createBooking(db: DB, input: CreateBookingInput): CreatedBooking {
  const now = input.now ?? new Date();
  const quantity = Math.trunc(input.quantity);

  if (quantity < 1 || quantity > config.maxPerBooking) {
    throw new BookingError(
      `Between 1 and ${config.maxPerBooking} tickets per booking.`,
      'too_many',
      400
    );
  }

  const run = db.transaction((): CreatedBooking => {
    const tier = db.prepare(`SELECT * FROM tiers WHERE id = ?`).get(input.tierId) as
      | TierRow
      | undefined;
    if (!tier) throw new BookingError('That ticket type does not exist.', 'unknown_tier', 404);

    const party = partyRowById(db, tier.party_id);
    if (!party) throw new BookingError('There is no party right now.', 'no_party', 404);
    if (party.status !== 'live') {
      throw new BookingError('That party is not on sale.', 'party_closed', 409);
    }
    if (new Date(party.ends_at).getTime() <= now.getTime()) {
      throw new BookingError('That party is over.', 'party_closed', 409);
    }
    if (tier.door_only === 1) {
      throw new BookingError('That tier is sold on the door only.', 'door_only', 409);
    }

    const remaining = tier.quantity - tier.sold;
    if (remaining <= 0) throw new BookingError('That tier is sold out.', 'sold_out', 409);
    if (remaining < quantity) {
      throw new BookingError(
        `Only ${remaining} left in ${tier.name}.`,
        'not_enough_left',
        409
      );
    }
    if (soldFor(db, party.id) + quantity > party.capacity) {
      throw new BookingError('The room is full.', 'at_capacity', 409);
    }

    /* The guard in the WHERE clause is the actual lock on the inventory. */
    const taken = db
      .prepare(`UPDATE tiers SET sold = sold + ? WHERE id = ? AND quantity - sold >= ?`)
      .run(quantity, tier.id, quantity);
    if (taken.changes !== 1) {
      throw new BookingError('Someone got there first.', 'not_enough_left', 409);
    }

    const amountCents = tier.price_cents * quantity;
    /* Free tickets and pay-at-the-door bookings are confirmed on the spot;
       anything with a price waits for the payment provider to say so. */
    const status =
      amountCents === 0 || config.payments.provider === 'mock' ? 'confirmed' : 'pending';

    let ref = makeRef();
    for (let attempt = 0; attempt < 5; attempt++) {
      const clash = db.prepare(`SELECT 1 FROM bookings WHERE ref = ?`).get(ref);
      if (!clash) break;
      ref = makeRef();
    }

    db.prepare(
      `INSERT INTO bookings
         (ref, party_id, tier_id, name, email, quantity, amount_cents, currency,
          status, payment_provider, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      ref,
      party.id,
      tier.id,
      input.name.trim(),
      input.email.trim().toLowerCase(),
      quantity,
      amountCents,
      tier.currency,
      status,
      config.payments.provider,
      now.toISOString()
    );

    const booking = db.prepare(`SELECT * FROM bookings WHERE ref = ?`).get(ref) as BookingRow;
    const freshTier = db.prepare(`SELECT * FROM tiers WHERE id = ?`).get(tier.id) as TierRow;
    return { booking, party, tier: freshTier };
  });

  return run();
}

export function bookingByRef(db: DB, ref: string): BookingRow | undefined {
  return db.prepare(`SELECT * FROM bookings WHERE ref = ?`).get(ref) as BookingRow | undefined;
}

export function bookingByPaymentRef(db: DB, paymentRef: string): BookingRow | undefined {
  return db.prepare(`SELECT * FROM bookings WHERE payment_ref = ?`).get(paymentRef) as
    | BookingRow
    | undefined;
}

export function attachPaymentRef(db: DB, ref: string, paymentRef: string): void {
  db.prepare(`UPDATE bookings SET payment_ref = ? WHERE ref = ?`).run(paymentRef, ref);
}

/** Idempotent: a webhook that arrives twice must not double-confirm. */
export function confirmBooking(db: DB, ref: string): BookingRow | undefined {
  db.prepare(`UPDATE bookings SET status = 'confirmed' WHERE ref = ? AND status = 'pending'`).run(
    ref
  );
  return bookingByRef(db, ref);
}

/** Cancelling puts the seats back on sale. */
export function cancelBooking(db: DB, ref: string): BookingRow | undefined {
  const run = db.transaction(() => {
    const booking = bookingByRef(db, ref);
    if (!booking || booking.status === 'cancelled') return booking;
    db.prepare(`UPDATE bookings SET status = 'cancelled' WHERE ref = ?`).run(ref);
    db.prepare(`UPDATE tiers SET sold = MAX(0, sold - ?) WHERE id = ?`).run(
      booking.quantity,
      booking.tier_id
    );
    return bookingByRef(db, ref);
  });
  return run();
}

export interface CheckInResult {
  booking: BookingRow;
  admitted: number;
  alreadyIn: boolean;
}

/** Door scanning. Admits the whole booking, and says so if it was already used. */
export function checkIn(db: DB, ref: string, now = new Date()): CheckInResult {
  const run = db.transaction((): CheckInResult => {
    const booking = bookingByRef(db, ref);
    if (!booking) throw new BookingError('No booking with that reference.', 'unknown_tier', 404);
    if (booking.status === 'cancelled') {
      throw new BookingError('That booking was cancelled.', 'party_closed', 409);
    }
    if (booking.status === 'pending') {
      throw new BookingError('That booking was never paid for.', 'party_closed', 409);
    }
    const alreadyIn = booking.checked_in_count > 0;
    if (!alreadyIn) {
      db.prepare(
        `UPDATE bookings SET checked_in_at = ?, checked_in_count = ? WHERE ref = ?`
      ).run(now.toISOString(), booking.quantity, ref);
    }
    return {
      booking: bookingByRef(db, ref) as BookingRow,
      admitted: booking.quantity,
      alreadyIn
    };
  });
  return run();
}

export interface BookingSummary {
  ref: string;
  name: string;
  email: string;
  quantity: number;
  amountCents: number;
  currency: string;
  status: string;
  tierName: string;
  checkedInAt: string | null;
  createdAt: string;
}

export function bookingsForParty(db: DB, partyId: number): BookingSummary[] {
  const rows = db
    .prepare(
      `SELECT b.ref, b.name, b.email, b.quantity, b.amount_cents, b.currency, b.status,
              b.checked_in_at, b.created_at, t.name AS tier_name
         FROM bookings b JOIN tiers t ON t.id = b.tier_id
        WHERE b.party_id = ?
        ORDER BY b.created_at DESC`
    )
    .all(partyId) as {
    ref: string; name: string; email: string; quantity: number; amount_cents: number;
    currency: string; status: string; checked_in_at: string | null; created_at: string;
    tier_name: string;
  }[];

  return rows.map((row) => ({
    ref: row.ref,
    name: row.name,
    email: row.email,
    quantity: row.quantity,
    amountCents: row.amount_cents,
    currency: row.currency,
    status: row.status,
    tierName: row.tier_name,
    checkedInAt: row.checked_in_at,
    createdAt: row.created_at
  }));
}

export interface PartyStats {
  sold: number;
  capacity: number;
  bookings: number;
  checkedIn: number;
  revenueCents: number;
  currency: string;
}

export function statsForParty(db: DB, partyId: number): PartyStats {
  const party = partyRowById(db, partyId);
  const agg = db
    .prepare(
      `SELECT COUNT(*) AS bookings,
              COALESCE(SUM(CASE WHEN status != 'cancelled' THEN quantity END), 0) AS sold,
              COALESCE(SUM(checked_in_count), 0) AS checked_in,
              COALESCE(SUM(CASE WHEN status = 'confirmed' THEN amount_cents END), 0) AS revenue,
              COALESCE(MAX(currency), 'EUR') AS currency
         FROM bookings WHERE party_id = ?`
    )
    .get(partyId) as {
    bookings: number; sold: number; checked_in: number; revenue: number; currency: string;
  };

  return {
    sold: agg.sold,
    capacity: party?.capacity ?? 0,
    bookings: agg.bookings,
    checkedIn: agg.checked_in,
    revenueCents: agg.revenue,
    currency: agg.currency
  };
}
