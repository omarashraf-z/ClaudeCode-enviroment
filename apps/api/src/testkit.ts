/** Shared setup for the tests: a throwaway database with one live party. */
import { openDatabase, setDb, type DB } from './db.js';

export interface Fixture {
  db: DB;
  partyId: number;
  cheapTierId: number;
  tinyTierId: number;
  doorTierId: number;
}

export function freshDb(options: { capacity?: number } = {}): Fixture {
  const db = openDatabase(':memory:');
  setDb(db);

  const soon = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
  const later = new Date(Date.now() + 7 * 24 * 3600 * 1000 + 8 * 3600 * 1000).toISOString();

  const party = db
    .prepare(
      `INSERT INTO parties (slug, volume, name, doors_at, ends_at, date_line, time_line,
                            venue_name, venue_area, venue_address, capacity, status, created_at)
       VALUES ('test-v1', 1, 'TEST PARTY', ?, ?, 'SAT 1 JAN', '23:00 – 07:00',
               'THE ROOM', 'Somewhere', '1 Test Street', ?, 'live', ?)`
    )
    .run(soon, later, options.capacity ?? 100, new Date().toISOString());
  const partyId = Number(party.lastInsertRowid);

  const tier = db.prepare(
    `INSERT INTO tiers (party_id, name, price_cents, quantity, sold, door_only, sort)
     VALUES (?, ?, ?, ?, 0, ?, ?)`
  );
  const cheapTierId = Number(tier.run(partyId, 'GENERAL', 1500, 50, 0, 0).lastInsertRowid);
  const tinyTierId = Number(tier.run(partyId, 'LAST FIVE', 2500, 5, 0, 0).lastInsertRowid);
  const doorTierId = Number(tier.run(partyId, 'ON THE DOOR', 3000, 20, 1, 2).lastInsertRowid);

  return { db, partyId, cheapTierId, tinyTierId, doorTierId };
}
