/* Fixture for the browser-only demo build. Mirrors apps/api/src/seed.ts.
   Placeholder content — the real party details still need to go in. */
export const DEMO_SEED = {
  party: {
    id: 1,
    slug: 'red-40-v8',
    volume: 8,
    name: 'RED 40',
    subtitle: 'Artificial colour. Real damage.',
    accent: '#ff2d3f',
    accentInk: '#12060a',
    doorsAt: '2026-09-26T23:00:00+02:00',
    endsAt: '2026-09-27T07:00:00+02:00',
    dateLine: 'SAT 26 SEP 2026',
    timeLine: '23:00 – 07:00',
    venue: {
      name: 'THE COLD STORE',
      area: 'Neukölln, Berlin',
      address: 'Sonnenallee 217, 12059 Berlin',
      mapUrl: 'https://maps.google.com/?q=Sonnenallee+217+12059+Berlin',
      secret: false,
      note: 'Unmarked door. Look for the red light.'
    },
    capacity: 400,
    creed:
      'We throw one party. We put everything into it. Then we stop, and there is nothing to buy, ' +
      'nothing to follow, nothing to scroll. No residency. No monthly. No brand activation. ' +
      'When the next one exists, this page will be that party instead — and this one will only ' +
      'exist in the memory of the people who were in the room.',
    lineup: [
      { time: '23:00', name: 'SYRUP', note: 'opening — slow and sweet', headline: false },
      { time: '00:30', name: 'MISS PECTIN', note: '', headline: false },
      { time: '02:00', name: 'XYLITOL b2b GLUCOSE', note: 'the reason you came', headline: true },
      { time: '04:00', name: 'HARD BOIL', note: '', headline: false },
      { time: '05:30', name: '???', note: 'announced at 05:29', headline: false }
    ],
    rules: [
      '18+. Bring ID or don’t bother.',
      'Cameras off on the floor. Sticker over the lens at the door.',
      'Racism, transphobia, groping: out, permanently, no discussion.',
      'Cash and card at the bar. Water is free, always.',
      'No re-entry after 03:00.'
    ]
  },
  tiers: [
    { id: 1, name: 'EARLY BEAR', priceCents: 1200, currency: 'EUR', quantity: 150, sold: 150, note: '', doorOnly: false },
    { id: 2, name: 'SECOND WAVE', priceCents: 1800, currency: 'EUR', quantity: 150, sold: 150, note: '', doorOnly: false },
    { id: 3, name: 'LAST BATCH', priceCents: 2500, currency: 'EUR', quantity: 80, sold: 39, note: '', doorOnly: false },
    { id: 4, name: 'ON THE DOOR', priceCents: 3000, currency: 'EUR', quantity: 20, sold: 0, note: 'only if the last batch doesn’t go', doorOnly: true }
  ],
  archive: [
    { volume: 7, name: 'BLUE RASPBERRY', dateLine: 'MAY 2026', venue: 'A car park, Wedding', capacity: 320 },
    { volume: 6, name: 'SUGAR SHOCK', dateLine: 'FEB 2026', venue: 'Former swimming baths', capacity: 280 },
    { volume: 5, name: 'GREEN APPLE', dateLine: 'OCT 2025', venue: 'Greenhouse, Marzahn', capacity: 200 },
    { volume: 4, name: 'CLEAR BEAR', dateLine: 'JUL 2025', venue: 'Nobody remembers', capacity: 260 },
    { volume: 3, name: 'MELTDOWN', dateLine: 'MAR 2025', venue: 'Boiler room, actual boiler', capacity: 180 },
    { volume: 2, name: 'SOUR', dateLine: 'NOV 2024', venue: 'Back of a print shop', capacity: 150 },
    { volume: 1, name: 'FIRST BATCH', dateLine: 'JUN 2024', venue: 'Someone’s flat', capacity: 60 }
  ],
  adminPassword: 'letmein',
  maxPerBooking: 4
};
