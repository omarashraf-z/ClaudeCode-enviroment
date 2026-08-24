/**
 * Seed data.
 *
 * NOTE: this is placeholder content — the party, venue, lineup and prices are
 * invented. Instagram (@thegummybeaars) could not be read from this machine,
 * so swap these values for the real ones, or enter the real party through the
 * admin panel at /admin and delete this file's contents.
 *
 *   npm run seed            fills an empty database
 *   npm run seed -- --reset wipes everything first
 */
import { getDb } from './db.js';

const db = getDb();
const reset = process.argv.includes('--reset');

if (reset) {
  db.exec(`DELETE FROM bookings; DELETE FROM rules; DELETE FROM lineup; DELETE FROM tiers; DELETE FROM parties;`);
}

const existing = db.prepare(`SELECT COUNT(*) AS n FROM parties`).get() as { n: number };
if (existing.n > 0) {
  console.log('Database already has parties. Nothing to do (use --reset to wipe).');
  process.exit(0);
}

const now = new Date().toISOString();

interface SeedParty {
  slug: string;
  volume: number;
  name: string;
  subtitle?: string;
  accent?: string;
  accentInk?: string;
  doorsAt: string;
  endsAt: string;
  dateLine: string;
  timeLine: string;
  venue: { name: string; area: string; address?: string; mapUrl?: string; secret?: boolean; note?: string };
  capacity: number;
  creed?: string;
  status: 'live' | 'past';
  lineup?: { time: string; name: string; note?: string; headline?: boolean }[];
  rules?: string[];
  tiers?: { name: string; priceCents: number; quantity: number; sold?: number; note?: string; doorOnly?: boolean }[];
}

const parties: SeedParty[] = [
  {
    slug: 'red-40-v8',
    volume: 8,
    name: 'RED 40',
    subtitle: 'Artificial colour. Real damage.',
    accent: '#ff2d3f',
    accentInk: '#12060a',
    doorsAt: '2026-09-26T23:00:00+02:00',
    endsAt: '2026-09-27T07:00:00+02:00',
    dateLine: 'SAT 26 SEP 2026',
    timeLine: '23:00 – 07:00',
    venue: {
      name: 'THE COLD STORE',
      area: 'Neukölln, Berlin',
      address: 'Sonnenallee 217, 12059 Berlin',
      mapUrl: 'https://maps.google.com/?q=Sonnenallee+217+12059+Berlin',
      note: 'Unmarked door. Look for the red light.'
    },
    capacity: 400,
    status: 'live',
    creed:
      'We throw one party. We put everything into it. Then we stop, and there is nothing to buy, ' +
      'nothing to follow, nothing to scroll. No residency. No monthly. No brand activation. ' +
      'When the next one exists, this page will be that party instead — and this one will only ' +
      'exist in the memory of the people who were in the room.',
    lineup: [
      { time: '23:00', name: 'SYRUP', note: 'opening — slow and sweet' },
      { time: '00:30', name: 'MISS PECTIN' },
      { time: '02:00', name: 'XYLITOL b2b GLUCOSE', note: 'the reason you came', headline: true },
      { time: '04:00', name: 'HARD BOIL' },
      { time: '05:30', name: '???', note: 'announced at 05:29' }
    ],
    rules: [
      '18+. Bring ID or don’t bother.',
      'Cameras off on the floor. Sticker over the lens at the door.',
      'Racism, transphobia, groping: out, permanently, no discussion.',
      'Cash and card at the bar. Water is free, always.',
      'No re-entry after 03:00.'
    ],
    tiers: [
      { name: 'EARLY BEAR', priceCents: 1200, quantity: 150, sold: 150 },
      { name: 'SECOND WAVE', priceCents: 1800, quantity: 150, sold: 150 },
      { name: 'LAST BATCH', priceCents: 2500, quantity: 80, sold: 39 },
      { name: 'ON THE DOOR', priceCents: 3000, quantity: 20, note: 'only if the last batch doesn’t go', doorOnly: true }
    ]
  }
];

const past: [number, string, string, string, number][] = [
  [7, 'BLUE RASPBERRY', 'MAY 2026', 'A car park, Wedding', 320],
  [6, 'SUGAR SHOCK', 'FEB 2026', 'Former swimming baths', 280],
  [5, 'GREEN APPLE', 'OCT 2025', 'Greenhouse, Marzahn', 200],
  [4, 'CLEAR BEAR', 'JUL 2025', 'Nobody remembers', 260],
  [3, 'MELTDOWN', 'MAR 2025', 'Boiler room, actual boiler', 180],
  [2, 'SOUR', 'NOV 2024', 'Back of a print shop', 150],
  [1, 'FIRST BATCH', 'JUN 2024', 'Someone’s flat', 60]
];

for (const [volume, name, dateLine, venue, capacity] of past) {
  parties.push({
    slug: `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-v${volume}`,
    volume,
    name,
    doorsAt: '2024-01-01T23:00:00+01:00',
    endsAt: '2024-01-02T07:00:00+01:00',
    dateLine,
    timeLine: '23:00 – 07:00',
    venue: { name: venue, area: '' },
    capacity,
    status: 'past'
  });
}

const insertParty = db.prepare(
  `INSERT INTO parties
     (slug, volume, name, subtitle, accent, accent_ink, doors_at, ends_at, date_line, time_line,
      venue_name, venue_area, venue_address, venue_map_url, venue_secret, venue_note,
      capacity, creed, status, created_at)
   VALUES (@slug, @volume, @name, @subtitle, @accent, @accentInk, @doorsAt, @endsAt, @dateLine,
           @timeLine, @venueName, @venueArea, @venueAddress, @venueMapUrl, @venueSecret,
           @venueNote, @capacity, @creed, @status, @createdAt)`
);
const insertTier = db.prepare(
  `INSERT INTO tiers (party_id, name, price_cents, currency, quantity, sold, note, door_only, sort)
   VALUES (?, ?, ?, 'EUR', ?, ?, ?, ?, ?)`
);
const insertAct = db.prepare(
  `INSERT INTO lineup (party_id, slot_time, name, note, headline, sort) VALUES (?, ?, ?, ?, ?, ?)`
);
const insertRule = db.prepare(`INSERT INTO rules (party_id, text, sort) VALUES (?, ?, ?)`);

db.transaction(() => {
  for (const party of parties) {
    const info = insertParty.run({
      slug: party.slug,
      volume: party.volume,
      name: party.name,
      subtitle: party.subtitle ?? '',
      accent: party.accent ?? '#ff2d3f',
      accentInk: party.accentInk ?? '#12060a',
      doorsAt: party.doorsAt,
      endsAt: party.endsAt,
      dateLine: party.dateLine,
      timeLine: party.timeLine,
      venueName: party.venue.name,
      venueArea: party.venue.area,
      venueAddress: party.venue.address ?? '',
      venueMapUrl: party.venue.mapUrl ?? '',
      venueSecret: party.venue.secret ? 1 : 0,
      venueNote: party.venue.note ?? '',
      capacity: party.capacity,
      creed: party.creed ?? '',
      status: party.status,
      createdAt: now
    });
    const id = Number(info.lastInsertRowid);
    party.tiers?.forEach((tier, index) =>
      insertTier.run(id, tier.name, tier.priceCents, tier.quantity, tier.sold ?? 0, tier.note ?? '', tier.doorOnly ? 1 : 0, index)
    );
    party.lineup?.forEach((act, index) =>
      insertAct.run(id, act.time, act.name, act.note ?? '', act.headline ? 1 : 0, index)
    );
    party.rules?.forEach((rule, index) => insertRule.run(id, rule, index));
  }
})();

console.log(`Seeded ${parties.length} parties (1 live, ${parties.length - 1} archived).`);
