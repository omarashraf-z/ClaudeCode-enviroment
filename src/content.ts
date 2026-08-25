/* ============================================================================
   GUMMYBEARS — content.ts
   ----------------------------------------------------------------------------
   Site-wide settings that rarely change: the brand, how people pay, and the
   booking limit. The party itself (name, date, venue, tickets, rules) and
   the archive list are no longer here — they live in Supabase and are
   edited live from /admin. See src/lib/partyData.ts.
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

  /** How many tickets one person can reserve at once. */
  maxPerReservation: 4,

  /* ── The mailer ──────────────────────────────────────────────────────────
     A Google Apps Script web app (google-apps-script/) that does nothing
     but send the two guest emails — "we got it" and "you're confirmed".
     Leave '' to skip sending mail entirely. */
  mailEndpoint:
    (import.meta.env.VITE_MAIL_ENDPOINT as string | undefined) ||
    'https://script.google.com/macros/s/AKfycbwGBcEOS4cWalPALpqEaRVCsY3ldBDzfUmZv4UsLKc24Gr_EdLcWgE-Usw6eCYGJWM8/exec'
};

export const money = (amount: number, currency = SITE.payment.currency) =>
  `${new Intl.NumberFormat('en-EG').format(amount)} ${currency}`;
