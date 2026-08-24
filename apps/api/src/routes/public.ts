import { Router } from 'express';
import { z } from 'zod';
import { getDb } from '../db.js';
import { archive, livePartyRow, partyRowById, toPublicParty } from '../parties.js';
import {
  BookingError,
  attachPaymentRef,
  bookingByRef,
  confirmBooking,
  createBooking
} from '../bookings.js';
import { startCheckout, verifyStripeWebhook } from '../payments.js';
import { sendBookingConfirmation } from '../notify.js';
import { normaliseRef } from '../ref.js';
import { rateLimit } from '../ratelimit.js';
import { config } from '../config.js';

export const publicRouter: Router = Router();

publicRouter.get('/health', (_req, res) => {
  res.json({ ok: true, provider: config.payments.provider });
});

/** The whole home page in one request: the party, or null when there isn't one. */
publicRouter.get('/party', (_req, res) => {
  const db = getDb();
  const row = livePartyRow(db);
  res.json({
    party: row ? toPublicParty(db, row) : null,
    archive: archive(db),
    maxPerBooking: config.maxPerBooking
  });
});

publicRouter.get('/archive', (_req, res) => {
  res.json({ archive: archive(getDb()) });
});

const bookingInput = z.object({
  tierId: z.number().int().positive(),
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(160),
  quantity: z.number().int().min(1).max(config.maxPerBooking)
});

publicRouter.post(
  '/bookings',
  rateLimit({ windowMs: 60_000, max: 10, key: 'bookings' }),
  async (req, res, next) => {
    const parsed = bookingInput.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Check the form.', details: parsed.error.flatten() });
      return;
    }

    const db = getDb();
    try {
      const { booking, party, tier } = createBooking(db, parsed.data);

      let checkoutUrl: string | null = null;
      try {
        const checkout = await startCheckout({ booking, party, tier });
        checkoutUrl = checkout.url;
        if (checkout.paymentRef) attachPaymentRef(db, booking.ref, checkout.paymentRef);
      } catch (error) {
        /* The seats are already taken but we cannot collect the money, so give
           them back rather than leaving a ghost booking holding inventory. */
        const { cancelBooking } = await import('../bookings.js');
        cancelBooking(db, booking.ref);
        next(error);
        return;
      }

      if (booking.status === 'confirmed') sendBookingConfirmation(booking, party);

      res.status(201).json({
        ref: booking.ref,
        status: booking.status,
        quantity: booking.quantity,
        amountCents: booking.amount_cents,
        currency: booking.currency,
        checkoutUrl,
        payAtDoor: config.payments.provider === 'mock' && booking.amount_cents > 0
      });
    } catch (error) {
      if (error instanceof BookingError) {
        res.status(error.status).json({ error: error.message, code: error.code });
        return;
      }
      next(error);
    }
  }
);

/** The reference is the capability — it is long and random, and it is the
 *  only thing needed to show a ticket at the door. */
publicRouter.get('/bookings/:ref', (req, res) => {
  const db = getDb();
  const booking = bookingByRef(db, normaliseRef(req.params.ref));
  if (!booking || booking.status === 'cancelled') {
    res.status(404).json({ error: 'No ticket with that reference.' });
    return;
  }
  const party = partyRowById(db, booking.party_id);
  if (!party) {
    res.status(404).json({ error: 'No ticket with that reference.' });
    return;
  }
  const tier = db.prepare(`SELECT name FROM tiers WHERE id = ?`).get(booking.tier_id) as
    | { name: string }
    | undefined;

  res.json({
    ref: booking.ref,
    name: booking.name,
    quantity: booking.quantity,
    status: booking.status,
    amountCents: booking.amount_cents,
    currency: booking.currency,
    tierName: tier?.name ?? '',
    checkedInAt: booking.checked_in_at,
    payAtDoor: booking.payment_provider === 'mock' && booking.amount_cents > 0,
    party: {
      name: party.name,
      volume: party.volume,
      accent: party.accent,
      accentInk: party.accent_ink,
      dateLine: party.date_line,
      timeLine: party.time_line,
      doorsAt: party.doors_at,
      endsAt: party.ends_at,
      venue:
        party.venue_secret === 1
          ? { name: 'LOCATION TBA', address: 'Sent to ticket holders 24 hours before doors.' }
          : { name: party.venue_name, address: party.venue_address }
    }
  });
});

/** Stripe calls this. express.raw() is mounted for this path in app.ts so the
 *  signature can be checked against the exact bytes Stripe signed. */
publicRouter.post('/webhooks/stripe', (req, res) => {
  const event = verifyStripeWebhook(req.body as Buffer, req.header('stripe-signature'));
  if (!event) {
    res.status(400).json({ error: 'Bad signature.' });
    return;
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as { client_reference_id?: string; metadata?: { booking_ref?: string } };
    const ref = session.client_reference_id ?? session.metadata?.booking_ref;
    if (ref) {
      const db = getDb();
      const booking = confirmBooking(db, ref);
      const party = booking ? partyRowById(db, booking.party_id) : undefined;
      if (booking && party && booking.status === 'confirmed') {
        sendBookingConfirmation(booking, party);
      }
    }
  }

  res.json({ received: true });
});
