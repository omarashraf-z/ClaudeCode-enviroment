# GUMMYBEARS

A site for an entertainment brand that throws **one party at a time**. The home
page *is* the current party. People reserve a spot by transferring the money by
InstaPay and attaching the screenshot; you check it and confirm them by hand.

There is no server to run and nothing to pay for. It is a folder of static
files on GitHub Pages, and the reservation desk is a Google Sheet.

```
src/
  content.ts        ← THE ONLY FILE YOU EDIT BETWEEN PARTIES
  pages/            HomePage (the poster), ReservePage (the form)
  components/       top bar, ticker, countdown, grain
  reserve.ts        sends a reservation to the sheet
  styles/           poster.css (the poster) + app.css (form, payment, receipt)
google-apps-script/
  Code.gs           the reservation desk — paste this into your sheet
  README.md         three-minute setup
```

## How a reservation actually works

1. Someone opens the site, hits **RESERVE A SPOT**, picks a ticket and how many.
2. The page shows the exact total and your InstaPay address, with a copy button.
3. They send the money in their own banking app, screenshot it, and attach it.
4. They fill in name, phone and email, and press send.
5. The screenshot goes into your Drive, a row lands in your sheet as `PENDING`,
   they get a "we'll confirm soon" email, and you get an alert.
6. You look at the transfer and set the row to `CONFIRMED` or `REJECTED`.

No card processing, no QR codes, no tickets to scan. `REJECTED` puts the spot
back on sale automatically; everything else is you and the sheet.

## Running a party

Everything lives in `src/content.ts`: name, date, venue, capacity, ticket types
and prices, lineup, house rules, your InstaPay details, the archive. Edit it,
push, and the site updates itself.

- `accent` is a hex colour and repaints the entire site, so each party looks
  like itself.
- Set `party: null` when there isn't one, and the site shows its **NOT YET**
  state — the archive and nothing else. That is a designed state, not an
  empty page.
- The site ages itself off the clock with no action from you:

| When | The page |
|---|---|
| Before doors | countdown to doors, tickets, `RESERVE A SPOT` |
| Doors → end | `HAPPENING NOW`, countdown to the end of the night |
| After the end | `IT'S OVER`, dead buttons, "nothing is planned" |
| `party: null` | `NOT YET` |

The "x left" counters come from the sheet: each ticket type's `quantity` in
`content.ts`, minus what's been reserved. When a type runs out it disappears
from the form; when everything runs out the site says SOLD OUT. If the sheet
is unreachable the counters just don't appear — the page still works.

## Setting it up

1. **The desk** — follow [`google-apps-script/README.md`](google-apps-script/README.md).
   Three minutes, once. Paste the resulting URL into `reservationEndpoint`.
2. **The content** — replace everything marked `PLACEHOLDER` in
   `src/content.ts`, including your real InstaPay address and email.
3. **Publishing** — repo → **Settings → Pages → Source: GitHub Actions**. Every
   push then builds and deploys automatically.

Locally:

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static files in dist/
```

With no `reservationEndpoint` set, the form still runs end to end but sends
nothing, and the confirmation screen says so instead of pretending.

## Notes

- Routing is hash-based (`/#/reserve`) because Pages has no server to rewrite
  paths.
- Screenshots are resized in the browser before upload, so a 6 MB photo
  becomes a few hundred KB and still uploads on a bad signal outside a venue.
- The form has a honeypot field; obvious bot submissions are dropped by the
  script without a row.
- No cookies, no analytics, no third-party scripts. Fonts come from Google
  Fonts with system fallbacks.
- An older version of this repo had a full Express + SQLite booking API with
  Stripe and QR check-in. It is gone from the working tree but preserved in
  git history at commit `29e9cd6`, if card payments are ever wanted.
