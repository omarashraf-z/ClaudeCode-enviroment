/* ============================================================================
   GUMMYBEARS — content.ts
   ----------------------------------------------------------------------------
   The whole site reads from this file. It is the only file you edit between
   parties. No database, no admin panel: change it, push, done.

   ⚠️  EVERYTHING MARKED "PLACEHOLDER" IS INVENTED and must be replaced with
       the real thing before you send anyone here.
   ========================================================================== */

export interface TicketType {
  /** Shown on the poster and in the reservation form. */
  name: string;
  price: number;
  /** How many of this type exist. Used for the "x left" counter. */
  quantity: number;
  note?: string;
  /** Sold at the door only — shown on the poster, not reservable online. */
  doorOnly?: boolean;
}

export interface Party {
  volume: number;
  name: string;
  subtitle?: string;
  /** Drives the entire palette of the site. Any hex colour. */
  accent: string;
  accentInk: string;
  /** ISO 8601 WITH a timezone offset, so the countdown is right everywhere. */
  doorsAt: string;
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
  creed?: string;
}

export const SITE = {
  brand: {
    name: 'GUMMYBEARS',
    motto: 'One party at a time.',
    instagram: 'https://www.instagram.com/thegummybeaars/',
    email: 'PLACEHOLDER@example.com',      // ← your real address
    /** Optional. Leave '' to hide the WhatsApp link. */
    whatsapp: ''
  },

  /* ── The reservation desk ────────────────────────────────────────────────
     Paste the Google Apps Script web app URL here (it ends in /exec).
     See google-apps-script/README.md — it takes about three minutes.
     While this is empty the form still works, but nothing is sent: it shows
     the confirmation screen and says plainly that it was not submitted. */
  reservationEndpoint:
    (import.meta.env.VITE_RESERVATION_ENDPOINT as string | undefined) ||
    'https://script.google.com/macros/s/AKfycbwGBcEOS4cWalPALpqEaRVCsY3ldBDzfUmZv4UsLKc24Gr_EdLcWgE-Usw6eCYGJWM8/exec',

  /* ── How people pay ──────────────────────────────────────────────────── */
  payment: {
    label: 'InstaPay',
    /** The name that shows up in their transfer app. */
    accountName: 'PLACEHOLDER — account name',
    /** Your InstaPay address or number, shown big and copyable. */
    address: 'PLACEHOLDER@instapay',
    currency: 'EGP',
    /** Steps shown above the upload field. Keep them short. */
    steps: [
      'Send the exact total shown above, to the account above.',
      'Screenshot the transfer confirmation.',
      'Fill in your details below and attach that screenshot.'
    ],
    /** Small print under the form. */
    note: 'Your spot is held once we check the transfer. If something is wrong with it we will message you.'
  },

  /** Where the real site lives. Only used by the preview notice. */
  liveUrl: 'https://omarashraf-z.github.io/ClaudeCode-enviroment/',

  /** How many tickets one person can reserve at once. */
  maxPerReservation: 4,

  /* ── THE PARTY. Set to null when there isn't one. ─────────────────────── */
  party: {
    volume: 8,
    name: 'RED 40',                                    // PLACEHOLDER
    subtitle: 'Artificial colour. Real damage.',       // PLACEHOLDER
    accent: '#ff2d3f',
    accentInk: '#12060a',
    doorsAt: '2026-09-26T23:00:00+03:00',              // PLACEHOLDER
    endsAt: '2026-09-27T05:00:00+03:00',               // PLACEHOLDER
    dateLine: 'SAT 26 SEP 2026',                       // PLACEHOLDER
    timeLine: '23:00 – 05:00',                         // PLACEHOLDER
    venue: {
      name: 'PLACEHOLDER VENUE',
      area: 'PLACEHOLDER CITY',
      address: 'PLACEHOLDER street address',
      mapUrl: '',
      secret: false,
      note: ''
    },
    capacity: 400,                                     // PLACEHOLDER
    tickets: [
      { name: 'EARLY BEAR', price: 400, quantity: 150 },        // PLACEHOLDER
      { name: 'SECOND WAVE', price: 600, quantity: 150 },       // PLACEHOLDER
      { name: 'LAST BATCH', price: 800, quantity: 100 },        // PLACEHOLDER
      { name: 'ON THE DOOR', price: 1000, quantity: 0, doorOnly: true, note: 'if anything is left' }
    ],
    lineup: [
      { time: '23:00', name: 'PLACEHOLDER DJ', note: 'opening' },
      { time: '01:00', name: 'PLACEHOLDER HEADLINER', headline: true },
      { time: '03:00', name: 'PLACEHOLDER CLOSER' }
    ],
    rules: [
      '18+. Bring ID or don’t bother.',
      'Cameras off on the floor.',
      'Racism, harassment, groping: out, permanently, no discussion.',
      'Water is free, always.'
    ],
    creed:
      'We throw one party. We put everything into it. Then we stop, and there is nothing to buy, ' +
      'nothing to follow, nothing to scroll. When the next one exists, this page will be that ' +
      'party instead — and this one will only exist in the memory of the people who were there.'
  } as Party | null,

  /** Everything already done. Newest first. */
  archive: [
    { volume: 7, name: 'PLACEHOLDER', dateLine: 'MAY 2026', venue: 'PLACEHOLDER' }
  ] as { volume: number; name: string; dateLine: string; venue?: string }[]
};

export const money = (amount: number, currency = SITE.payment.currency) =>
  `${new Intl.NumberFormat('en-EG').format(amount)} ${currency}`;
