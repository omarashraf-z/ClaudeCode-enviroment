import type { DB } from './db.js';
import type { ArchiveParty, PartyRow, PublicParty, PublicTier, TierRow } from './types.js';

export function livePartyRow(db: DB): PartyRow | undefined {
  return db.prepare(`SELECT * FROM parties WHERE status = 'live'`).get() as PartyRow | undefined;
}

export function partyRowById(db: DB, id: number): PartyRow | undefined {
  return db.prepare(`SELECT * FROM parties WHERE id = ?`).get(id) as PartyRow | undefined;
}

export function tiersFor(db: DB, partyId: number): TierRow[] {
  return db
    .prepare(`SELECT * FROM tiers WHERE party_id = ? ORDER BY sort, id`)
    .all(partyId) as TierRow[];
}

/** Seats already committed across every tier of a party. */
export function soldFor(db: DB, partyId: number): number {
  const row = db
    .prepare(`SELECT COALESCE(SUM(sold), 0) AS sold FROM tiers WHERE party_id = ?`)
    .get(partyId) as { sold: number };
  return row.sold;
}

function toPublicTier(tier: TierRow): PublicTier {
  const remaining = Math.max(0, tier.quantity - tier.sold);
  return {
    id: tier.id,
    name: tier.name,
    priceCents: tier.price_cents,
    currency: tier.currency,
    quantity: tier.quantity,
    remaining,
    soldOut: remaining === 0,
    doorOnly: tier.door_only === 1,
    note: tier.note
  };
}

export function toPublicParty(db: DB, party: PartyRow): PublicParty {
  const tiers = tiersFor(db, party.id);
  const sold = tiers.reduce((total, tier) => total + tier.sold, 0);
  const secret = party.venue_secret === 1;

  const lineup = db
    .prepare(`SELECT slot_time, name, note, headline FROM lineup WHERE party_id = ? ORDER BY sort, id`)
    .all(party.id) as { slot_time: string; name: string; note: string; headline: number }[];

  const rules = db
    .prepare(`SELECT text FROM rules WHERE party_id = ? ORDER BY sort, id`)
    .all(party.id) as { text: string }[];

  const ticketsLeft = Math.max(0, Math.min(party.capacity - sold, tiers.reduce(
    (total, tier) => total + Math.max(0, tier.quantity - tier.sold), 0
  )));

  return {
    id: party.id,
    slug: party.slug,
    volume: party.volume,
    name: party.name,
    subtitle: party.subtitle,
    accent: party.accent,
    accentInk: party.accent_ink,
    doorsAt: party.doors_at,
    endsAt: party.ends_at,
    dateLine: party.date_line,
    timeLine: party.time_line,
    venue: {
      name: secret ? '' : party.venue_name,
      area: party.venue_area,
      /* A secret venue is secret in the API too, not just in the UI. */
      address: secret ? null : party.venue_address,
      mapUrl: secret ? null : party.venue_map_url || null,
      secret,
      note: party.venue_note
    },
    capacity: party.capacity,
    ticketsLeft,
    soldOut: ticketsLeft === 0,
    creed: party.creed,
    lineup: lineup.map((act) => ({
      time: act.slot_time,
      name: act.name,
      note: act.note,
      headline: act.headline === 1
    })),
    rules: rules.map((rule) => rule.text),
    tiers: tiers.map(toPublicTier)
  };
}

export function archive(db: DB): ArchiveParty[] {
  const rows = db
    .prepare(`SELECT volume, name, date_line, venue_name, venue_area, capacity
              FROM parties WHERE status = 'past' ORDER BY volume DESC`)
    .all() as (Pick<PartyRow, 'volume' | 'name' | 'date_line' | 'venue_name' | 'venue_area' | 'capacity'>)[];

  return rows.map((row) => ({
    volume: row.volume,
    name: row.name,
    dateLine: row.date_line,
    venue: [row.venue_name, row.venue_area].filter(Boolean).join(', '),
    capacity: row.capacity
  }));
}
