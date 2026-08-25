/**
 * The browser-only backend, used by the demo build (VITE_DEMO=1).
 *
 * It answers exactly the same paths, shapes and status codes as apps/api, so
 * nothing in the pages knows the difference — but it holds its state in
 * localStorage instead of SQLite. That makes the app deployable as a plain
 * static page with no server, at the cost of the state being per-browser:
 * your bookings are yours, and clearing site data resets the party.
 *
 * The real thing is apps/api. This exists so the front end can be shown
 * running before the API is hosted anywhere.
 */
import { DEMO_SEED } from './seed';

const STORE_KEY = 'gummybears-demo-v1';

interface Booking {
  ref: string;
  tierId: number;
  name: string;
  email: string;
  quantity: number;
  amountCents: number;
  currency: string;
  status: 'confirmed' | 'cancelled';
  checkedInAt: string | null;
  createdAt: string;
}

interface Store {
  tiers: typeof DEMO_SEED.tiers;
  bookings: Booking[];
  signedIn: boolean;
  partyStatus: 'live' | 'past';
}

function load(): Store {
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (raw) return JSON.parse(raw) as Store;
  } catch {
    /* private mode, or a browser that refuses storage — fall through */
  }
  return {
    tiers: structuredClone(DEMO_SEED.tiers),
    bookings: [],
    signedIn: false,
    partyStatus: 'live'
  };
}

function save(store: Store): void {
  try {
    window.localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    /* nothing we can do, and nothing worth breaking the page over */
  }
}

const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
function makeRef(): string {
  const block = (n: number) =>
    Array.from(
      { length: n },
      () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
    ).join('');
  return `GB-${block(4)}-${block(4)}`;
}

function normaliseRef(input: string): string {
  const cleaned = input.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const body = cleaned.startsWith('GB') ? cleaned.slice(2) : cleaned;
  return body.length === 8 ? `GB-${body.slice(0, 4)}-${body.slice(4)}` : input.trim().toUpperCase();
}

const soldTotal = (store: Store) => store.tiers.reduce((total, tier) => total + tier.sold, 0);

function publicParty(store: Store) {
  const tiers = store.tiers.map((tier) => ({
    id: tier.id,
    name: tier.name,
    priceCents: tier.priceCents,
    currency: tier.currency,
    quantity: tier.quantity,
    remaining: Math.max(0, tier.quantity - tier.sold),
    soldOut: tier.quantity - tier.sold <= 0,
    doorOnly: tier.doorOnly,
    note: tier.note
  }));
  const ticketsLeft = Math.min(
    DEMO_SEED.party.capacity - soldTotal(store),
    tiers.reduce((total, tier) => total + (tier.doorOnly ? 0 : tier.remaining), 0)
  );
  return {
    ...DEMO_SEED.party,
    ticketsLeft: Math.max(0, ticketsLeft),
    soldOut: ticketsLeft <= 0,
    tiers
  };
}

export interface DemoResponse {
  status: number;
  body: unknown;
}

const fail = (status: number, error: string, code?: string): DemoResponse => ({
  status,
  body: { error, code }
});

/* eslint-disable complexity */
export function handleDemoRequest(path: string, method: string, payload: unknown): DemoResponse {
  const store = load();
  const body = (payload ?? {}) as Record<string, any>;

  /* ── public ─────────────────────────────────────────────────────────── */
  if (path === '/party' && method === 'GET') {
    return {
      status: 200,
      body: {
        party: store.partyStatus === 'live' ? publicParty(store) : null,
        archive: DEMO_SEED.archive,
        maxPerBooking: DEMO_SEED.maxPerBooking
      }
    };
  }

  if (path === '/bookings' && method === 'POST') {
    if (store.partyStatus !== 'live') return fail(409, 'That party is not on sale.', 'party_closed');

    const tier = store.tiers.find((candidate) => candidate.id === Number(body.tierId));
    if (!tier) return fail(404, 'That ticket type does not exist.', 'unknown_tier');
    if (tier.doorOnly) return fail(409, 'That tier is sold on the door only.', 'door_only');

    const quantity = Math.trunc(Number(body.quantity));
    if (!Number.isFinite(quantity) || quantity < 1 || quantity > DEMO_SEED.maxPerBooking) {
      return fail(400, `Between 1 and ${DEMO_SEED.maxPerBooking} tickets per booking.`, 'too_many');
    }
    const name = String(body.name ?? '').trim();
    const email = String(body.email ?? '').trim().toLowerCase();
    if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return fail(400, 'Check the form.');
    }

    const remaining = tier.quantity - tier.sold;
    if (remaining <= 0) return fail(409, 'That tier is sold out.', 'sold_out');
    if (remaining < quantity) return fail(409, `Only ${remaining} left in ${tier.name}.`, 'not_enough_left');
    if (soldTotal(store) + quantity > DEMO_SEED.party.capacity) {
      return fail(409, 'The room is full.', 'at_capacity');
    }

    tier.sold += quantity;
    const booking: Booking = {
      ref: makeRef(),
      tierId: tier.id,
      name,
      email,
      quantity,
      amountCents: tier.priceCents * quantity,
      currency: tier.currency,
      status: 'confirmed',
      checkedInAt: null,
      createdAt: new Date().toISOString()
    };
    store.bookings.unshift(booking);
    save(store);

    return {
      status: 201,
      body: {
        ref: booking.ref,
        status: booking.status,
        quantity: booking.quantity,
        amountCents: booking.amountCents,
        currency: booking.currency,
        checkoutUrl: null,
        payAtDoor: booking.amountCents > 0
      }
    };
  }

  const ticketMatch = /^\/bookings\/([^/]+)$/.exec(path);
  if (ticketMatch && method === 'GET') {
    const ref = normaliseRef(decodeURIComponent(ticketMatch[1] ?? ''));
    const booking = store.bookings.find((candidate) => candidate.ref === ref);
    if (!booking || booking.status === 'cancelled') {
      return fail(404, 'No ticket with that reference.');
    }
    const tier = store.tiers.find((candidate) => candidate.id === booking.tierId);
    return {
      status: 200,
      body: {
        ref: booking.ref,
        name: booking.name,
        quantity: booking.quantity,
        status: booking.status,
        amountCents: booking.amountCents,
        currency: booking.currency,
        tierName: tier?.name ?? '',
        checkedInAt: booking.checkedInAt,
        payAtDoor: booking.amountCents > 0,
        party: {
          name: DEMO_SEED.party.name,
          volume: DEMO_SEED.party.volume,
          accent: DEMO_SEED.party.accent,
          accentInk: DEMO_SEED.party.accentInk,
          dateLine: DEMO_SEED.party.dateLine,
          timeLine: DEMO_SEED.party.timeLine,
          doorsAt: DEMO_SEED.party.doorsAt,
          endsAt: DEMO_SEED.party.endsAt,
          venue: {
            name: DEMO_SEED.party.venue.name,
            address: DEMO_SEED.party.venue.address
          }
        }
      }
    };
  }

  /* ── the door ───────────────────────────────────────────────────────── */
  if (path === '/admin/login' && method === 'POST') {
    if (String(body.password ?? '') !== DEMO_SEED.adminPassword) {
      return fail(401, 'Wrong password.');
    }
    store.signedIn = true;
    save(store);
    return { status: 200, body: { ok: true } };
  }

  if (path === '/admin/logout' && method === 'POST') {
    store.signedIn = false;
    save(store);
    return { status: 200, body: { ok: true } };
  }

  if (path.startsWith('/admin')) {
    if (!store.signedIn) return fail(401, 'Not signed in.');

    if (path === '/admin/session') return { status: 200, body: { ok: true } };

    if (path === '/admin/parties' && method === 'GET') {
      return {
        status: 200,
        body: {
          parties: [
            {
              id: 1,
              slug: DEMO_SEED.party.slug,
              volume: DEMO_SEED.party.volume,
              name: DEMO_SEED.party.name,
              status: store.partyStatus,
              dateLine: DEMO_SEED.party.dateLine,
              doorsAt: DEMO_SEED.party.doorsAt,
              endsAt: DEMO_SEED.party.endsAt,
              capacity: DEMO_SEED.party.capacity
            },
            ...DEMO_SEED.archive.map((entry) => ({
              id: 100 + entry.volume,
              slug: `${entry.name.toLowerCase().replace(/\W+/g, '-')}-v${entry.volume}`,
              volume: entry.volume,
              name: entry.name,
              status: 'past' as const,
              dateLine: entry.dateLine,
              doorsAt: '',
              endsAt: '',
              capacity: entry.capacity
            }))
          ]
        }
      };
    }

    const bookingsMatch = /^\/admin\/parties\/(\d+)\/bookings$/.exec(path);
    if (bookingsMatch && method === 'GET') {
      if (bookingsMatch[1] !== '1') {
        return { status: 200, body: { bookings: [], stats: emptyStats() } };
      }
      const live = store.bookings.filter((booking) => booking.status !== 'cancelled');
      return {
        status: 200,
        body: {
          bookings: store.bookings.map((booking) => ({
            ref: booking.ref,
            name: booking.name,
            email: booking.email,
            quantity: booking.quantity,
            amountCents: booking.amountCents,
            currency: booking.currency,
            status: booking.status,
            tierName: store.tiers.find((tier) => tier.id === booking.tierId)?.name ?? '',
            checkedInAt: booking.checkedInAt,
            createdAt: booking.createdAt
          })),
          stats: {
            sold: soldTotal(store),
            capacity: DEMO_SEED.party.capacity,
            bookings: store.bookings.length,
            checkedIn: live
              .filter((booking) => booking.checkedInAt)
              .reduce((total, booking) => total + booking.quantity, 0),
            revenueCents: live.reduce((total, booking) => total + booking.amountCents, 0),
            currency: 'EUR'
          }
        }
      };
    }

    if (path === '/admin/checkin' && method === 'POST') {
      const ref = normaliseRef(String(body.ref ?? ''));
      const booking = store.bookings.find((candidate) => candidate.ref === ref);
      if (!booking) return fail(404, 'No booking with that reference.');
      if (booking.status === 'cancelled') return fail(409, 'That booking was cancelled.');
      const alreadyIn = Boolean(booking.checkedInAt);
      if (!alreadyIn) {
        booking.checkedInAt = new Date().toISOString();
        save(store);
      }
      return {
        status: 200,
        body: {
          ref: booking.ref,
          name: booking.name,
          admitted: booking.quantity,
          alreadyIn,
          checkedInAt: booking.checkedInAt
        }
      };
    }

    const cancelMatch = /^\/admin\/bookings\/([^/]+)\/cancel$/.exec(path);
    if (cancelMatch && method === 'POST') {
      const ref = normaliseRef(decodeURIComponent(cancelMatch[1] ?? ''));
      const booking = store.bookings.find((candidate) => candidate.ref === ref);
      if (!booking) return fail(404, 'No booking with that reference.');
      if (booking.status !== 'cancelled') {
        booking.status = 'cancelled';
        const tier = store.tiers.find((candidate) => candidate.id === booking.tierId);
        if (tier) tier.sold = Math.max(0, tier.sold - booking.quantity);
        save(store);
      }
      return { status: 200, body: { ok: true, status: 'cancelled' } };
    }

    const publishMatch = /^\/admin\/parties\/(\d+)\/(publish|archive)$/.exec(path);
    if (publishMatch && method === 'POST') {
      if (publishMatch[1] !== '1') {
        return fail(409, 'RED 40 is still live. End that party before starting the next one.', 'one_party_at_a_time');
      }
      store.partyStatus = publishMatch[2] === 'publish' ? 'live' : 'past';
      save(store);
      return { status: 200, body: { ok: true } };
    }
  }

  return fail(404, 'No such endpoint.');
}

function emptyStats() {
  return { sold: 0, capacity: 0, bookings: 0, checkedIn: 0, revenueCents: 0, currency: 'EUR' };
}

/** Wipe the demo back to a fresh party. */
export function resetDemo(): void {
  try {
    window.localStorage.removeItem(STORE_KEY);
  } catch {
    /* ignore */
  }
}
