import { Router } from 'express';
import { z } from 'zod';
import { getDb } from '../db.js';
import { livePartyRow, partyRowById, tiersFor, toPublicParty } from '../parties.js';
import {
  BookingError,
  bookingsForParty,
  cancelBooking,
  checkIn,
  statsForParty
} from '../bookings.js';
import {
  checkPassword,
  clearSessionCookie,
  requireAdmin,
  setSessionCookie
} from '../auth.js';
import { normaliseRef } from '../ref.js';
import { rateLimit } from '../ratelimit.js';
import type { PartyRow } from '../types.js';

export const adminRouter: Router = Router();

adminRouter.post(
  '/login',
  rateLimit({ windowMs: 60_000, max: 8, key: 'admin-login' }),
  (req, res) => {
    const parsed = z.object({ password: z.string().min(1).max(200) }).safeParse(req.body);
    if (!parsed.success || !checkPassword(parsed.data.password)) {
      res.status(401).json({ error: 'Wrong password.' });
      return;
    }
    setSessionCookie(res);
    res.json({ ok: true });
  }
);

adminRouter.post('/logout', (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

adminRouter.get('/session', (req, res) => {
  const cookies = req.cookies as Record<string, string> | undefined;
  void cookies;
  requireAdmin(req, res, () => res.json({ ok: true }));
});

/* Everything below needs a session. */
adminRouter.use(requireAdmin);

const partyList = (row: PartyRow) => ({
  id: row.id,
  slug: row.slug,
  volume: row.volume,
  name: row.name,
  status: row.status,
  dateLine: row.date_line,
  doorsAt: row.doors_at,
  endsAt: row.ends_at,
  capacity: row.capacity
});

adminRouter.get('/parties', (_req, res) => {
  const db = getDb();
  const rows = db
    .prepare(`SELECT * FROM parties ORDER BY CASE status WHEN 'live' THEN 0 WHEN 'draft' THEN 1 ELSE 2 END, volume DESC`)
    .all() as PartyRow[];
  res.json({ parties: rows.map(partyList) });
});

adminRouter.get('/parties/:id', (req, res) => {
  const db = getDb();
  const row = partyRowById(db, Number(req.params.id));
  if (!row) {
    res.status(404).json({ error: 'No such party.' });
    return;
  }
  res.json({ party: toPublicParty(db, row), status: row.status, stats: statsForParty(db, row.id) });
});

const tierInput = z.object({
  name: z.string().trim().min(1).max(60),
  priceCents: z.number().int().min(0),
  currency: z.string().trim().length(3).default('EUR'),
  quantity: z.number().int().min(0),
  note: z.string().trim().max(160).default(''),
  doorOnly: z.boolean().default(false)
});

const partyInput = z.object({
  name: z.string().trim().min(1).max(60),
  volume: z.number().int().min(1),
  subtitle: z.string().trim().max(160).default(''),
  accent: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#ff2d3f'),
  accentInk: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#12060a'),
  doorsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }),
  dateLine: z.string().trim().min(1).max(60),
  timeLine: z.string().trim().min(1).max(60),
  venue: z.object({
    name: z.string().trim().max(80).default(''),
    area: z.string().trim().max(80).default(''),
    address: z.string().trim().max(200).default(''),
    mapUrl: z.string().trim().url().or(z.literal('')).default(''),
    secret: z.boolean().default(false),
    note: z.string().trim().max(200).default('')
  }),
  capacity: z.number().int().min(1),
  creed: z.string().trim().max(2000).default(''),
  lineup: z
    .array(
      z.object({
        time: z.string().trim().max(20).default(''),
        name: z.string().trim().min(1).max(80),
        note: z.string().trim().max(160).default(''),
        headline: z.boolean().default(false)
      })
    )
    .default([]),
  rules: z.array(z.string().trim().min(1).max(200)).default([]),
  tiers: z.array(tierInput).default([])
});

function slugify(name: string, volume: number): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${base || 'party'}-v${volume}`;
}

adminRouter.post('/parties', (req, res) => {
  const parsed = partyInput.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Check the party.', details: parsed.error.flatten() });
    return;
  }
  const input = parsed.data;
  if (new Date(input.endsAt) <= new Date(input.doorsAt)) {
    res.status(400).json({ error: 'The party has to end after it starts.' });
    return;
  }

  const db = getDb();
  const create = db.transaction(() => {
    const info = db
      .prepare(
        `INSERT INTO parties
           (slug, volume, name, subtitle, accent, accent_ink, doors_at, ends_at, date_line,
            time_line, venue_name, venue_area, venue_address, venue_map_url, venue_secret,
            venue_note, capacity, creed, status, created_at)
         VALUES (@slug, @volume, @name, @subtitle, @accent, @accentInk, @doorsAt, @endsAt,
                 @dateLine, @timeLine, @venueName, @venueArea, @venueAddress, @venueMapUrl,
                 @venueSecret, @venueNote, @capacity, @creed, 'draft', @createdAt)`
      )
      .run({
        slug: slugify(input.name, input.volume),
        volume: input.volume,
        name: input.name,
        subtitle: input.subtitle,
        accent: input.accent,
        accentInk: input.accentInk,
        doorsAt: input.doorsAt,
        endsAt: input.endsAt,
        dateLine: input.dateLine,
        timeLine: input.timeLine,
        venueName: input.venue.name,
        venueArea: input.venue.area,
        venueAddress: input.venue.address,
        venueMapUrl: input.venue.mapUrl,
        venueSecret: input.venue.secret ? 1 : 0,
        venueNote: input.venue.note,
        capacity: input.capacity,
        creed: input.creed,
        createdAt: new Date().toISOString()
      });

    const partyId = Number(info.lastInsertRowid);
    const tier = db.prepare(
      `INSERT INTO tiers (party_id, name, price_cents, currency, quantity, note, door_only, sort)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    input.tiers.forEach((row, index) =>
      tier.run(partyId, row.name, row.priceCents, row.currency.toUpperCase(), row.quantity, row.note, row.doorOnly ? 1 : 0, index)
    );

    const act = db.prepare(
      `INSERT INTO lineup (party_id, slot_time, name, note, headline, sort) VALUES (?, ?, ?, ?, ?, ?)`
    );
    input.lineup.forEach((row, index) =>
      act.run(partyId, row.time, row.name, row.note, row.headline ? 1 : 0, index)
    );

    const rule = db.prepare(`INSERT INTO rules (party_id, text, sort) VALUES (?, ?, ?)`);
    input.rules.forEach((text, index) => rule.run(partyId, text, index));

    return partyId;
  });

  try {
    const id = create();
    res.status(201).json({ id });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not save that.';
    res.status(409).json({ error: message });
  }
});

/** THE RULE. One live party — the database has a partial unique index that
 *  makes a second one impossible, so publishing asks you to end the old one
 *  rather than quietly doing it for you. */
adminRouter.post('/parties/:id/publish', (req, res) => {
  const db = getDb();
  const id = Number(req.params.id);
  const party = partyRowById(db, id);
  if (!party) {
    res.status(404).json({ error: 'No such party.' });
    return;
  }
  const live = livePartyRow(db);
  if (live && live.id !== id) {
    res.status(409).json({
      error: `${live.name} is still live. End that party before starting the next one.`,
      code: 'one_party_at_a_time',
      livePartyId: live.id
    });
    return;
  }
  db.prepare(`UPDATE parties SET status = 'live' WHERE id = ?`).run(id);
  res.json({ ok: true });
});

adminRouter.post('/parties/:id/archive', (req, res) => {
  const db = getDb();
  const id = Number(req.params.id);
  if (!partyRowById(db, id)) {
    res.status(404).json({ error: 'No such party.' });
    return;
  }
  db.prepare(`UPDATE parties SET status = 'past' WHERE id = ?`).run(id);
  res.json({ ok: true });
});

const tierPatch = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  priceCents: z.number().int().min(0).optional(),
  quantity: z.number().int().min(0).optional(),
  note: z.string().trim().max(160).optional(),
  doorOnly: z.boolean().optional()
});

adminRouter.patch('/tiers/:id', (req, res) => {
  const parsed = tierPatch.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Check the tier.', details: parsed.error.flatten() });
    return;
  }
  const db = getDb();
  const id = Number(req.params.id);
  const tier = db.prepare(`SELECT * FROM tiers WHERE id = ?`).get(id) as
    | { sold: number }
    | undefined;
  if (!tier) {
    res.status(404).json({ error: 'No such tier.' });
    return;
  }
  const patch = parsed.data;
  if (patch.quantity !== undefined && patch.quantity < tier.sold) {
    res.status(409).json({ error: `${tier.sold} are already sold in that tier.` });
    return;
  }

  db.prepare(
    `UPDATE tiers SET
       name = COALESCE(@name, name),
       price_cents = COALESCE(@priceCents, price_cents),
       quantity = COALESCE(@quantity, quantity),
       note = COALESCE(@note, note),
       door_only = COALESCE(@doorOnly, door_only)
     WHERE id = @id`
  ).run({
    id,
    name: patch.name ?? null,
    priceCents: patch.priceCents ?? null,
    quantity: patch.quantity ?? null,
    note: patch.note ?? null,
    doorOnly: patch.doorOnly === undefined ? null : patch.doorOnly ? 1 : 0
  });
  res.json({ ok: true });
});

adminRouter.get('/parties/:id/bookings', (req, res) => {
  const db = getDb();
  const id = Number(req.params.id);
  if (!partyRowById(db, id)) {
    res.status(404).json({ error: 'No such party.' });
    return;
  }
  res.json({ bookings: bookingsForParty(db, id), stats: statsForParty(db, id) });
});

adminRouter.post('/checkin', (req, res) => {
  const parsed = z.object({ ref: z.string().trim().min(4).max(40) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Give me a reference.' });
    return;
  }
  try {
    const result = checkIn(getDb(), normaliseRef(parsed.data.ref));
    res.json({
      ref: result.booking.ref,
      name: result.booking.name,
      admitted: result.admitted,
      alreadyIn: result.alreadyIn,
      checkedInAt: result.booking.checked_in_at
    });
  } catch (error) {
    if (error instanceof BookingError) {
      res.status(error.status).json({ error: error.message, code: error.code });
      return;
    }
    throw error;
  }
});

adminRouter.post('/bookings/:ref/cancel', (req, res) => {
  const booking = cancelBooking(getDb(), normaliseRef(req.params.ref));
  if (!booking) {
    res.status(404).json({ error: 'No booking with that reference.' });
    return;
  }
  res.json({ ok: true, status: booking.status });
});
