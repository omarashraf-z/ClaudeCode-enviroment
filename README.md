# GUMMYBEARS

An entertainment brand that throws **one party at a time**, and a booking system
that believes it. The home page *is* the current party. You can buy a ticket,
get a QR code, and be scanned in at the door.

- **Front end** — React 19 + TypeScript + Vite, React Router. Mobile first: the
  primary visitor is somebody tapping the Instagram bio link on a phone.
- **Back end** — Express + SQLite (better-sqlite3), TypeScript, zod. No cloud
  services required to run the whole thing.
- **Tests** — 21 of them, `node:test`, covering the parts where money and
  capacity are at stake.

```
apps/
  api/                Express + SQLite
    src/
      db.ts           schema and connection
      parties.ts      party reads, public payload shaping
      bookings.ts     selling, cancelling, checking in  ← the important file
      payments.ts     mock + Stripe Checkout (REST, no SDK)
      auth.ts         signed-cookie sessions for the door staff
      routes/         public.ts, admin.ts
      seed.ts         placeholder party + archive
  web/                React front end
    src/
      pages/          HomePage, BookPage, TicketPage, AdminPage
      components/     top bar, ticker, countdown, grain
      styles/         poster.css (the poster) + app.css (booking, ticket, door)
```

## Running it

```bash
npm install
npm run seed          # placeholder party + seven archived ones
npm run dev           # api on :4000, web on :5173
```

Open http://localhost:5173. The door panel is at `/admin`, password `letmein`
in development.

```bash
npm test              # the booking and API tests
npm run typecheck
npm run build         # builds both; the API then serves the front end itself
npm start             # single process on :4000, front end included
```

## THE RULE is a constraint, not a convention

One party at a time is enforced three deep, so nothing in the UI has to
remember it:

- `CREATE UNIQUE INDEX one_live_party ON parties(status) WHERE status = 'live'`
  — the database physically cannot hold two live parties.
- Publishing a draft while another party is live returns `409
  one_party_at_a_time` and names the party you have to end first.
- With no live party the site renders its **NOT YET** state — archive and
  nothing else. That is a designed state, not an empty page.

The site also ages itself off the clock, with no cron and no admin action:

| When | The page |
|---|---|
| Before doors | countdown to doors, tiers, `GET IN` |
| Doors → end | `HAPPENING NOW`, countdown to the end of the night |
| After the end | `IT'S OVER`, dead buttons, "nothing is planned" |
| No live party | `NOT YET` |

## Tickets cannot be oversold

`createBooking` runs in one SQLite transaction, and the UPDATE that takes the
seats carries its own guard:

```sql
UPDATE tiers SET sold = sold + ? WHERE id = ? AND quantity - sold >= ?
```

If two people tap *BOOK IT* on the last two tickets in the same millisecond,
the second UPDATE matches no rows and its whole transaction rolls back. On top
of that, `tiers` has `CHECK (sold <= quantity)`, and the room's own capacity is
checked across every tier. The test suite hammers this (`never oversells under
a burst of bookings`).

Cancelling a booking puts the seats back on sale. Checking in is idempotent —
a screenshot passed round the queue admits the same people once, and the door
panel says `⚠ already scanned` on the second try.

## Payments

`PAYMENT_PROVIDER=mock` (default): no money moves. Bookings confirm instantly
and the ticket reads *pay at the door*. Everything works end to end with no
accounts and no keys.

`PAYMENT_PROVIDER=stripe`: real Stripe Checkout via the REST API — no SDK
dependency. Set `STRIPE_SECRET_KEY`, point a webhook at
`POST /api/webhooks/stripe` for `checkout.session.completed`, and set
`STRIPE_WEBHOOK_SECRET`. The booking is held as `pending` until the webhook
confirms it; if the session can't be created the seats are released rather than
left hanging. Signature verification (including replay tolerance) is
hand-rolled in `payments.ts` and unit tested.

> The Stripe path is written but has not been run against Stripe from here —
> there are no keys in this environment. Test it in Stripe test mode before a
> real on-sale.

## Running a party

Everything is in the door panel at `/admin`:

1. Create the party (name, volume, date, venue, capacity, lineup, house rules,
   ticket tiers). `accent` is a hex colour and repaints the entire site — every
   party looks like itself.
2. End the current party. Then publish the new one.
3. Watch it sell: sold / capacity, bookings, people in the room, takings.
4. On the night, type or scan references into **CHECK SOMEONE IN**.

Ticket references (`GB-4KX7-9QMD`) avoid `0/O/1/I/L` and are read leniently —
lower case, no dashes, spaces, all fine. Somebody is reading these off a
cracked phone screen next to a speaker.

## Deploying

Simplest: one process. `npm run build` then `npm start` — the API serves the
built front end from the same port, so there is no CORS and no second host.
Works on Fly, Render, Railway, a VPS. Set `ADMIN_PASSWORD`, `SESSION_SECRET`
and `WEB_ORIGIN`; the server refuses to boot in production without the first
two. Keep `apps/api/data/` on a persistent volume — that file is the bookings.

Split hosting also works: put `apps/web/dist` on Netlify or Vercel (SPA
rewrite to `index.html`), host the API anywhere, and set `WEB_ORIGIN` to the
front-end origin.

## Known gaps, honestly

- **No confirmation emails.** `notify.ts` logs the ticket link instead of
  pretending to send. Implement that one function with Resend / Postmark / SES
  and nothing else changes.
- **The content is placeholder.** Instagram is blocked from the machine this
  was built on, so @thegummybeaars could not be read — the party, venue,
  lineup, prices and archive in `apps/api/src/seed.ts` are invented. Replace
  them, or just enter the real party in `/admin` and run
  `npm run seed -- --reset` to clear the fakes.
- **No card payments until Stripe keys are set** (see above).
- **Refunds** are not automated; cancelling a booking frees the seat but does
  not move money.
