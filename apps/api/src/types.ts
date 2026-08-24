export type PartyStatus = 'draft' | 'live' | 'past';
export type BookingStatus = 'pending' | 'confirmed' | 'cancelled';

export interface PartyRow {
  id: number;
  slug: string;
  volume: number;
  name: string;
  subtitle: string;
  accent: string;
  accent_ink: string;
  doors_at: string;
  ends_at: string;
  date_line: string;
  time_line: string;
  venue_name: string;
  venue_area: string;
  venue_address: string;
  venue_map_url: string;
  venue_secret: number;
  venue_note: string;
  capacity: number;
  creed: string;
  status: PartyStatus;
  created_at: string;
}

export interface TierRow {
  id: number;
  party_id: number;
  name: string;
  price_cents: number;
  currency: string;
  quantity: number;
  sold: number;
  note: string;
  door_only: number;
  sort: number;
}

export interface BookingRow {
  id: number;
  ref: string;
  party_id: number;
  tier_id: number;
  name: string;
  email: string;
  quantity: number;
  amount_cents: number;
  currency: string;
  status: BookingStatus;
  payment_provider: string;
  payment_ref: string | null;
  checked_in_at: string | null;
  checked_in_count: number;
  created_at: string;
}

/** What the public API hands the front end. */
export interface PublicTier {
  id: number;
  name: string;
  priceCents: number;
  currency: string;
  quantity: number;
  remaining: number;
  soldOut: boolean;
  doorOnly: boolean;
  note: string;
}

export interface PublicParty {
  id: number;
  slug: string;
  volume: number;
  name: string;
  subtitle: string;
  accent: string;
  accentInk: string;
  doorsAt: string;
  endsAt: string;
  dateLine: string;
  timeLine: string;
  venue: {
    name: string;
    area: string;
    address: string | null;
    mapUrl: string | null;
    secret: boolean;
    note: string;
  };
  capacity: number;
  ticketsLeft: number;
  soldOut: boolean;
  creed: string;
  lineup: { time: string; name: string; note: string; headline: boolean }[];
  rules: string[];
  tiers: PublicTier[];
}

export interface ArchiveParty {
  volume: number;
  name: string;
  dateLine: string;
  venue: string;
  capacity: number;
}
