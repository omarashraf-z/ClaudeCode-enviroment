export interface Tier {
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

export interface Party {
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
  tiers: Tier[];
}

export interface ArchiveEntry {
  volume: number;
  name: string;
  dateLine: string;
  venue: string;
  capacity: number;
}

export interface HomePayload {
  party: Party | null;
  archive: ArchiveEntry[];
  maxPerBooking: number;
}

export interface BookingCreated {
  ref: string;
  status: 'pending' | 'confirmed';
  quantity: number;
  amountCents: number;
  currency: string;
  checkoutUrl: string | null;
  payAtDoor: boolean;
}

export interface Ticket {
  ref: string;
  name: string;
  quantity: number;
  status: string;
  amountCents: number;
  currency: string;
  tierName: string;
  checkedInAt: string | null;
  payAtDoor: boolean;
  party: {
    name: string;
    volume: number;
    accent: string;
    accentInk: string;
    dateLine: string;
    timeLine: string;
    doorsAt: string;
    endsAt: string;
    venue: { name: string; address: string };
  };
}

export interface AdminPartySummary {
  id: number;
  slug: string;
  volume: number;
  name: string;
  status: 'draft' | 'live' | 'past';
  dateLine: string;
  doorsAt: string;
  endsAt: string;
  capacity: number;
}

export interface AdminBooking {
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

export interface PartyStats {
  sold: number;
  capacity: number;
  bookings: number;
  checkedIn: number;
  revenueCents: number;
  currency: string;
}

/** upcoming → live → over, or quiet when there is no party at all. */
export type PartyState = 'quiet' | 'upcoming' | 'live' | 'over';
