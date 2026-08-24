/* ============================================================================
   GUMMYBEARS — content.js
   ----------------------------------------------------------------------------
   This is the ONLY file you edit between parties.
   The site renders itself from this object. No build step, no dependencies.

   THE RULE: there is exactly one party. When it's done, move it into `archive`
   and either write the next one into `party` — or set `party: null` and let the
   site say the truth: nothing is planned.
   ========================================================================== */

window.GUMMYBEARS = {

  brand: {
    name: 'GUMMYBEARS',
    motto: 'One party at a time.',
    // Shown in the scrolling ticker. Keep them short and shouty.
    ticker: [
      'ONE PARTY AT A TIME',
      'NO RESIDENCY',
      'NO SERIES',
      'NO SECOND CHANCE',
      'WHEN IT’S GONE IT’S GONE'
    ]
  },

  /* --------------------------------------------------------------------------
     THE PARTY. Set to `null` when there isn't one. Don't invent a placeholder.
     Times are ISO 8601 WITH an offset so countdowns are correct everywhere.
     ------------------------------------------------------------------------ */
  party: {
    volume: 8,
    name: 'RED 40',
    subtitle: 'Artificial colour. Real damage.',
    // accent drives the entire palette of the site. Each party looks different.
    accent: '#ff2d3f',
    accentInk: '#12060a',

    doors: '2026-09-26T23:00:00+02:00',
    endsAt: '2026-09-27T07:00:00+02:00',
    // Human strings — used verbatim, so write them the way you'd say them.
    dateLine: 'SAT 26 SEP 2026',
    timeLine: '23:00 – 07:00',

    venue: {
      name: 'THE COLD STORE',
      area: 'Neukölln, Berlin',
      address: 'Sonnenallee 217, 12059 Berlin',
      mapUrl: 'https://maps.google.com/?q=Sonnenallee+217+12059+Berlin',
      // Set true if you only drop the location to ticket holders.
      secret: false,
      note: 'Unmarked door. Look for the red light.'
    },

    capacity: 400,
    ticketsLeft: 41,
    ticketUrl: 'https://tickets.example.com/gummybears-red-40',

    lineup: [
      { time: '23:00', name: 'SYRUP',                   note: 'opening — slow and sweet' },
      { time: '00:30', name: 'MISS PECTIN',             note: '' },
      { time: '02:00', name: 'XYLITOL b2b GLUCOSE',     note: 'the reason you came', headline: true },
      { time: '04:00', name: 'HARD BOIL',               note: '' },
      { time: '05:30', name: '???',                     note: 'announced at 05:29' }
    ],

    tiers: [
      { name: 'EARLY BEAR',  price: '€12', state: 'sold-out' },
      { name: 'SECOND WAVE', price: '€18', state: 'sold-out' },
      { name: 'LAST BATCH',  price: '€25', state: 'on-sale', left: 41 },
      { name: 'ON THE DOOR', price: '€30', state: 'maybe',   note: 'only if the last batch doesn’t go' }
    ],

    rules: [
      '18+. Bring ID or don’t bother.',
      'Cameras off on the floor. Sticker over the lens at the door.',
      'Racism, transphobia, groping: out, permanently, no discussion.',
      'Cash and card at the bar. Water is free, always.',
      'No re-entry after 03:00.'
    ],

    creed:
      'We throw one party. We put everything into it. Then we stop, and there is nothing to buy, ' +
      'nothing to follow, nothing to scroll. No residency. No monthly. No brand activation. ' +
      'When the next one exists, this page will be that party instead — and this one will only ' +
      'exist in the memory of the people who were in the room.'
  },

  /* Everything that already happened. Newest first. All of it is gone. */
  archive: [
    { volume: 7, name: 'BLUE RASPBERRY', date: 'MAY 2026',  venue: 'A car park in Wedding',       capacity: 320 },
    { volume: 6, name: 'SUGAR SHOCK',    date: 'FEB 2026',  venue: 'Former swimming baths',        capacity: 280 },
    { volume: 5, name: 'GREEN APPLE',    date: 'OCT 2025',  venue: 'Greenhouse, Marzahn',          capacity: 200 },
    { volume: 4, name: 'CLEAR BEAR',     date: 'JUL 2025',  venue: 'Nobody remembers',             capacity: 260 },
    { volume: 3, name: 'MELTDOWN',       date: 'MAR 2025',  venue: 'Boiler room, actual boiler',   capacity: 180 },
    { volume: 2, name: 'SOUR',           date: 'NOV 2024',  venue: 'Back of a print shop',         capacity: 150 },
    { volume: 1, name: 'FIRST BATCH',    date: 'JUN 2024',  venue: 'Someone’s flat',               capacity: 60  }
  ],

  links: {
    instagram: 'https://instagram.com/gummybears',
    email: 'door@gummybears.party'
  },

  /* The mailing list.
     endpoint: paste a form URL (Formspree, Buttondown, Netlify Forms action…)
     and the form POSTs to it. Leave it null and the form falls back to opening
     the visitor's mail client — no fake success messages either way. */
  list: {
    endpoint: null,
    blurb: 'One email, once, when the next party exists. Nothing else, ever.'
  }
};
