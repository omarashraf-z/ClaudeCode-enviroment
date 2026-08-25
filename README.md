# GUMMYBEARS

A site for an entertainment brand that throws **one party at a time**. The home
page *is* the current party. People make an account, reserve a spot by
transferring the money by InstaPay and attaching the screenshot, and you
accept or reject them from an admin panel.

The site itself is a folder of static files on GitHub Pages. Accounts, the
party's details, and every reservation live in Supabase; a small Google Apps
Script sends the two guest emails.

```
src/
  content.ts        brand, payment details, booking limit
  pages/            HomePage (the poster), ReservePage, LoginPage,
                     MyTicketsPage, AdminPage
  components/       top bar, ticker, countdown, grain, the auth form
  lib/
    supabaseClient.ts  the Supabase client
    auth.tsx           accounts — signup/login/logout
    partyData.ts        the live party + archive (read by everyone, edited by admins)
    adminReservations.ts   admin: list reservations, accept/reject
    mailer.ts          posts to the Apps Script mailer
  reserve.ts         submits a reservation, uploads the receipt
  styles/            poster.css (the poster) + app.css (forms, admin, payment)
supabase/
  schema.sql         one-time setup script — tables, security rules, seed data
google-apps-script/
  Code.gs            the mailer — sends the two guest emails
  README.md          setup
```

## How a reservation actually works

1. Someone opens the site, hits **RESERVE A SPOT** — if they're not logged
   in yet, they create an account (username + password) or log in first.
2. They pick a ticket and how many. The page shows the exact total and your
   InstaPay address, with a copy button.
3. They send the money in their own banking app, screenshot it, and attach
   it.
4. They fill in name, phone and email, and press send. The screenshot goes
   into Supabase Storage, a row lands in `reservations` as `pending`, and
   they get a "we got it" email.
5. You look at it in **/admin** and hit **ACCEPT** or **REJECT**. Accepting
   sends a confirmation email with a link to their ticket, and the
   reservation shows up on their **My Tickets** page. Rejecting frees the
   spot back up — nothing shows up for them.

No card processing, no QR codes, no tickets to scan.

## Running a party

Log into **/admin** with an admin account and edit the party right there —
name, date, venue, capacity, ticket types and prices, house rules, the
on/off switch, the archive. It's live the moment you save; nobody needs to
touch code or redeploy between parties.

`src/content.ts` still holds the handful of things that genuinely don't
change per party: the brand name, your InstaPay details, and how many
tickets one person can book at once.

- `accent` is a hex colour and repaints the entire site, so each party looks
  like itself.
- Turn the party **off** in the admin panel when there isn't one, and the
  site shows its **NOT YET** state — the archive and nothing else. That is a
  designed state, not an empty page.
- The site ages itself off the clock with no action from you:

| When | The page |
|---|---|
| Before doors | countdown to doors, tickets, `RESERVE A SPOT` |
| Doors → end | `HAPPENING NOW`, countdown to the end of the night |
| After the end | `IT'S OVER`, dead buttons, "nothing is planned" |
| Party off | `NOT YET` |

The "x left" counters come from live reservation counts in Supabase: each
ticket type's `quantity`, minus what's been reserved (a rejection frees the
spot again). When a type runs out it disappears from the form; when
everything runs out the site says SOLD OUT.

## Setting it up

1. **Supabase** — create a free project, then run `supabase/schema.sql` in
   its SQL editor. Turn off "Confirm email" under Authentication (accounts
   use a made-up address, not a real inbox). Paste the project URL and anon
   key into `src/lib/supabaseClient.ts`. Sign up once on the site, then
   promote that account with the `update profiles set is_admin = true...`
   line at the bottom of `schema.sql`.
2. **The mailer** — follow
   [`google-apps-script/README.md`](google-apps-script/README.md). Two
   minutes, once. Paste the resulting URL into `mailEndpoint` in
   `src/content.ts`.
3. **The content** — fill in your real InstaPay address and brand details in
   `src/content.ts`.
4. **Publishing** — repo → **Settings → Pages → Source: GitHub Actions**.
   Every push then builds and deploys automatically.

Locally:

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static files in dist/
```

## Notes

- Routing is hash-based (`/#/reserve`) because Pages has no server to rewrite
  paths.
- Screenshots are resized in the browser before upload, so a 6 MB photo
  becomes a few hundred KB and still uploads on a bad signal outside a venue.
- Access control is enforced by Supabase row-level security, not by hiding
  the anon key — that key is meant to be public. See `supabase/schema.sql`.
- No cookies beyond what Supabase auth needs, no analytics, no third-party
  scripts. Fonts come from Google Fonts with system fallbacks.
- An older version of this repo had a full Express + SQLite booking API with
  Stripe and QR check-in. It is gone from the working tree but preserved in
  git history at commit `29e9cd6`, if card payments are ever wanted.
