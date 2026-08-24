import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { config } from './config.js';

/* THE RULE, enforced in the storage layer:
   - `one_live_party` is a partial unique index, so two parties can never both
     be live. The concept is not a convention here, it is a constraint.
   - tiers CHECK (sold <= quantity) makes overselling impossible even if the
     booking transaction were wrong. */
const SCHEMA = `
CREATE TABLE IF NOT EXISTS parties (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  slug          TEXT    NOT NULL UNIQUE,
  volume        INTEGER NOT NULL,
  name          TEXT    NOT NULL,
  subtitle      TEXT    NOT NULL DEFAULT '',
  accent        TEXT    NOT NULL DEFAULT '#ff2d3f',
  accent_ink    TEXT    NOT NULL DEFAULT '#12060a',
  doors_at      TEXT    NOT NULL,
  ends_at       TEXT    NOT NULL,
  date_line     TEXT    NOT NULL,
  time_line     TEXT    NOT NULL,
  venue_name    TEXT    NOT NULL DEFAULT '',
  venue_area    TEXT    NOT NULL DEFAULT '',
  venue_address TEXT    NOT NULL DEFAULT '',
  venue_map_url TEXT    NOT NULL DEFAULT '',
  venue_secret  INTEGER NOT NULL DEFAULT 0,
  venue_note    TEXT    NOT NULL DEFAULT '',
  capacity      INTEGER NOT NULL CHECK (capacity > 0),
  creed         TEXT    NOT NULL DEFAULT '',
  status        TEXT    NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','live','past')),
  created_at    TEXT    NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS one_live_party ON parties(status) WHERE status = 'live';

CREATE TABLE IF NOT EXISTS tiers (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  party_id    INTEGER NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
  name        TEXT    NOT NULL,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  currency    TEXT    NOT NULL DEFAULT 'EUR',
  quantity    INTEGER NOT NULL CHECK (quantity >= 0),
  sold        INTEGER NOT NULL DEFAULT 0 CHECK (sold >= 0),
  note        TEXT    NOT NULL DEFAULT '',
  door_only   INTEGER NOT NULL DEFAULT 0,
  sort        INTEGER NOT NULL DEFAULT 0,
  CHECK (sold <= quantity)
);
CREATE INDEX IF NOT EXISTS tiers_party ON tiers(party_id);

CREATE TABLE IF NOT EXISTS lineup (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  party_id  INTEGER NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
  slot_time TEXT    NOT NULL DEFAULT '',
  name      TEXT    NOT NULL,
  note      TEXT    NOT NULL DEFAULT '',
  headline  INTEGER NOT NULL DEFAULT 0,
  sort      INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS lineup_party ON lineup(party_id);

CREATE TABLE IF NOT EXISTS rules (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  party_id INTEGER NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
  text     TEXT    NOT NULL,
  sort     INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS rules_party ON rules(party_id);

CREATE TABLE IF NOT EXISTS bookings (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  ref              TEXT    NOT NULL UNIQUE,
  party_id         INTEGER NOT NULL REFERENCES parties(id),
  tier_id          INTEGER NOT NULL REFERENCES tiers(id),
  name             TEXT    NOT NULL,
  email            TEXT    NOT NULL,
  quantity         INTEGER NOT NULL CHECK (quantity > 0),
  amount_cents     INTEGER NOT NULL CHECK (amount_cents >= 0),
  currency         TEXT    NOT NULL,
  status           TEXT    NOT NULL CHECK (status IN ('pending','confirmed','cancelled')),
  payment_provider TEXT    NOT NULL,
  payment_ref      TEXT,
  checked_in_at    TEXT,
  checked_in_count INTEGER NOT NULL DEFAULT 0,
  created_at       TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS bookings_party  ON bookings(party_id);
CREATE INDEX IF NOT EXISTS bookings_email  ON bookings(email);
CREATE INDEX IF NOT EXISTS bookings_status ON bookings(party_id, status);
`;

export type DB = Database.Database;

export function openDatabase(url: string = config.databaseUrl): DB {
  if (url !== ':memory:') mkdirSync(dirname(url), { recursive: true });
  const db = new Database(url);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  db.exec(SCHEMA);
  return db;
}

let singleton: DB | null = null;

/** The app's database. Tests build their own with openDatabase(':memory:'). */
export function getDb(): DB {
  if (!singleton) singleton = openDatabase();
  return singleton;
}

export function setDb(db: DB): void {
  singleton = db;
}
