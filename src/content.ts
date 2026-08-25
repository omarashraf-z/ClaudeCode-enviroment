/* ============================================================================
   GUMMYBEARS — content.ts
   ----------------------------------------------------------------------------
   The whole site reads from this file. It is the only file you edit between
   parties. No database, no admin panel: change it, push, done.
   ========================================================================== */

export interface TicketType {
  name: string;
  /** In whatever currency payment.currency says. */
  price: number;
  /** How many exist. Drives the "x left" counter and selling out. */
  quantity: number;
  note?: string;
  /** Sold at the door only — shown on the poster, not reservable online. */
  doorOnly?: boolean;
}

export interface Party {
  name: string;
  subtitle?: string;
  /** Drives the entire palette of the site. Any hex colour. */
  accent: string;
  accentInk: string;
  /** ISO 8601 WITH a timezone offset, so the countdown is right everywhere. */
  startsAt: string;
  endsAt: string;
  /** Written the way you'd say it out loud. */
  dateLine: string;
  timeLine: string;
  venue: {
    name: string;
    area: string;
    address?: string;
    mapUrl?: string;
    /** true → the address is replaced with "sent to confirmed guests". */
    secret?: boolean;
    note?: string;
  };
  capacity: number;
  tickets: TicketType[];
  lineup?: { time: string; name: string; note?: string; headline?: boolean }[];
  rules?: string[];
}

export const SITE = {
  brand: {
    name: 'GUMMYBEARS',
    motto: 'One party at a time.',
    instagram: 'https://www.instagram.com/thegummybeaars/',
    /** Leave '' to hide the email link in the footer. */
    email: '',
    /** Optional. Leave '' to hide the WhatsApp link. */
    whatsapp: ''
  },

  /* ── The reservation desk ────────────────────────────────────────────────
     The Google Apps Script web app. See google-apps-script/README.md. */
  reservationEndpoint:
    (import.meta.env.VITE_RESERVATION_ENDPOINT as string | undefined) ||
    'https://script.google.com/macros/s/AKfycbwGBcEOS4cWalPALpqEaRVCsY3ldBDzfUmZv4UsLKc24Gr_EdLcWgE-Usw6eCYGJWM8/exec',

  /* ── How people pay ──────────────────────────────────────────────────── */
  payment: {
    label: 'InstaPay',
    accountName: 'Omar A***** A**',
    address: 'omarashraf254@instapay',
    currency: 'EGP',
    steps: [
      'Send the exact total shown above, to the account above.',
      'Screenshot the transfer confirmation.',
      'Fill in your details below and attach that screenshot.'
    ],
    note: 'Your spot is held once we check the transfer. If something is wrong with it we will message you.'
  },

  /** Where the real site lives. Only used by the preview notice. */
  liveUrl: 'https://omarashraf-z.github.io/ClaudeCode-enviroment/',

  /** How many tickets one person can reserve at once. */
  maxPerReservation: 4,

  /* ── THE PARTY. Set to null when there isn't one. ─────────────────────── */
  party: {
    name: 'PEGAJOSA YACHT PARTY',
    subtitle: '',
    accent: '#ff2d3f',
    accentInk: '#12060a',
    startsAt: '2026-09-03T21:00:00+03:00',
    endsAt: '2026-09-04T02:00:00+03:00',
    dateLine: 'THU 3 SEP 2026',
    timeLine: '21:00 – 02:00',
    venue: {
      name: 'ZAMALEK',
      area: 'Cairo',
      address: '',
      mapUrl: '',
      secret: false,
      note: ''
    },
    capacity: 100,
    tickets: [
      { name: 'REGULAR', price: 1000, quantity: 100 }
    ],
    lineup: [],
    rules: [
      'No tickets on the door.',
      '18+.',
      'BYOB.'
    ]
  } as Party | null,

  /** Everything already done. Newest first. */
  archive: [
    { name: 'TEDDY PENTHOUSE PARTY' },
    { name: 'EID EVE' },
    { name: 'THE GUMMY BEAR HOUSE PARTY SERIES' }
  ] as { name: string; dateLine?: string; venue?: string }[]
};

export const money = (amount: number, currency = SITE.payment.currency) =>
  `${new Intl.NumberFormat('en-EG').format(amount)} ${currency}`;
