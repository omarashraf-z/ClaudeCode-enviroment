import assert from 'node:assert/strict';
import { after, describe, it } from 'node:test';
import { freshDb } from './testkit.js';
import {
  BookingError,
  bookingByRef,
  cancelBooking,
  checkIn,
  createBooking,
  statsForParty
} from './bookings.js';
import { livePartyRow, toPublicParty } from './parties.js';
import { makeRef, normaliseRef } from './ref.js';

const book = (fixture: ReturnType<typeof freshDb>, tierId: number, quantity: number) =>
  createBooking(fixture.db, {
    tierId,
    quantity,
    name: 'Ada Lovelace',
    email: 'ADA@example.com '
  });

describe('booking inventory', () => {
  it('takes seats out of the tier and returns a reference', () => {
    const fixture = freshDb();
    const { booking } = book(fixture, fixture.cheapTierId, 2);

    assert.match(booking.ref, /^GB-[2-9A-Z]{4}-[2-9A-Z]{4}$/);
    assert.equal(booking.quantity, 2);
    assert.equal(booking.amount_cents, 3000);
    assert.equal(booking.email, 'ada@example.com', 'email is normalised');
    assert.equal(booking.status, 'confirmed', 'the mock provider confirms immediately');

    const party = toPublicParty(fixture.db, livePartyRow(fixture.db)!);
    const tier = party.tiers.find((t) => t.id === fixture.cheapTierId)!;
    assert.equal(tier.remaining, 48);
  });

  it('will not sell more than a tier has', () => {
    const fixture = freshDb();
    book(fixture, fixture.tinyTierId, 4);

    assert.throws(
      () => book(fixture, fixture.tinyTierId, 4),
      (error: unknown) =>
        error instanceof BookingError && error.code === 'not_enough_left'
    );

    /* The one seat that is genuinely left still sells. */
    const last = book(fixture, fixture.tinyTierId, 1);
    assert.equal(last.tier.sold, 5);

    assert.throws(
      () => book(fixture, fixture.tinyTierId, 1),
      (error: unknown) => error instanceof BookingError && error.code === 'sold_out'
    );
  });

  it('never oversells under a burst of bookings', () => {
    const fixture = freshDb({ capacity: 500 });
    let sold = 0;
    let rejected = 0;

    /* 40 attempts at the 5-ticket tier, two at a time. */
    for (let attempt = 0; attempt < 40; attempt++) {
      try {
        const { booking } = book(fixture, fixture.tinyTierId, 2);
        sold += booking.quantity;
      } catch (error) {
        assert.ok(error instanceof BookingError);
        rejected += 1;
      }
    }

    const tier = fixture.db
      .prepare('SELECT sold, quantity FROM tiers WHERE id = ?')
      .get(fixture.tinyTierId) as { sold: number; quantity: number };
    assert.equal(tier.sold, 4, 'two bookings of two fit, the fifth seat cannot take a pair');
    assert.equal(sold, 4);
    assert.equal(rejected, 38);
    assert.ok(tier.sold <= tier.quantity);
  });

  it('stops at the capacity of the room even when tiers have stock', () => {
    const fixture = freshDb({ capacity: 6 });
    book(fixture, fixture.cheapTierId, 4);
    book(fixture, fixture.cheapTierId, 2);

    assert.throws(
      () => book(fixture, fixture.cheapTierId, 1),
      (error: unknown) => error instanceof BookingError && error.code === 'at_capacity'
    );
  });

  it('refuses door-only tiers, silly quantities, and dead parties', () => {
    const fixture = freshDb();

    assert.throws(
      () => book(fixture, fixture.doorTierId, 1),
      (error: unknown) => error instanceof BookingError && error.code === 'door_only'
    );
    assert.throws(
      () => book(fixture, fixture.cheapTierId, 9),
      (error: unknown) => error instanceof BookingError && error.code === 'too_many'
    );
    assert.throws(
      () => book(fixture, 9999, 1),
      (error: unknown) => error instanceof BookingError && error.code === 'unknown_tier'
    );

    fixture.db.prepare(`UPDATE parties SET status = 'past' WHERE id = ?`).run(fixture.partyId);
    assert.throws(
      () => book(fixture, fixture.cheapTierId, 1),
      (error: unknown) => error instanceof BookingError && error.code === 'party_closed'
    );
  });

  it('puts the seats back when a booking is cancelled', () => {
    const fixture = freshDb();
    const { booking } = book(fixture, fixture.tinyTierId, 3);

    cancelBooking(fixture.db, booking.ref);

    const tier = fixture.db
      .prepare('SELECT sold FROM tiers WHERE id = ?')
      .get(fixture.tinyTierId) as { sold: number };
    assert.equal(tier.sold, 0);
    assert.equal(bookingByRef(fixture.db, booking.ref)?.status, 'cancelled');

    /* Cancelling twice must not credit the seats twice. */
    cancelBooking(fixture.db, booking.ref);
    const again = fixture.db
      .prepare('SELECT sold FROM tiers WHERE id = ?')
      .get(fixture.tinyTierId) as { sold: number };
    assert.equal(again.sold, 0);
  });
});

describe('the door', () => {
  it('admits a booking once and says so the second time', () => {
    const fixture = freshDb();
    const { booking } = book(fixture, fixture.cheapTierId, 3);

    const first = checkIn(fixture.db, booking.ref);
    assert.equal(first.admitted, 3);
    assert.equal(first.alreadyIn, false);

    const second = checkIn(fixture.db, booking.ref);
    assert.equal(second.alreadyIn, true, 'a passed-around screenshot does not get three more people in');

    const stats = statsForParty(fixture.db, fixture.partyId);
    assert.equal(stats.checkedIn, 3);
    assert.equal(stats.sold, 3);
    assert.equal(stats.revenueCents, 4500);
  });

  it('turns away cancelled bookings', () => {
    const fixture = freshDb();
    const { booking } = book(fixture, fixture.cheapTierId, 1);
    cancelBooking(fixture.db, booking.ref);
    assert.throws(() => checkIn(fixture.db, booking.ref), /cancelled/i);
  });

  it('reads references the way a person types them', () => {
    assert.equal(normaliseRef('gb4kx79qmd'), 'GB-4KX7-9QMD');
    assert.equal(normaliseRef(' GB-4KX7-9QMD '), 'GB-4KX7-9QMD');
    assert.equal(normaliseRef('4kx7 9qmd'), 'GB-4KX7-9QMD');
  });

  it('generates references without ambiguous characters', () => {
    for (let i = 0; i < 200; i++) {
      assert.doesNotMatch(makeRef().slice(3), /[01OIL]/);
    }
  });
});

describe('the rule', () => {
  it('will not let two parties be live at once', () => {
    const fixture = freshDb();
    assert.throws(
      () =>
        fixture.db
          .prepare(
            `INSERT INTO parties (slug, volume, name, doors_at, ends_at, date_line, time_line,
                                  capacity, status, created_at)
             VALUES ('second-v2', 2, 'SECOND', ?, ?, 'x', 'y', 100, 'live', ?)`
          )
          .run(new Date().toISOString(), new Date().toISOString(), new Date().toISOString()),
      /UNIQUE constraint failed/
    );
  });
});

after(() => {
  /* nothing to clean: every fixture is an in-memory database */
});
