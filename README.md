# GUMMYBEARS

A one-page site for an entertainment brand that throws **one party at a time**.
The homepage *is* the current party. When the party is over, the page says so.
When there is no party, the page says that too.

Plain HTML, CSS and vanilla JS. No framework, no build step, no npm, no
dependencies. Drag the folder onto Netlify, Vercel or GitHub Pages and it works.
Double-clicking `index.html` works as well (nothing uses ES modules or `fetch`
on local files).

```
index.html          the whole site — one page, one poster
css/style.css       mobile-first styles; the accent colour is a CSS variable
js/content.js       ← THE ONLY FILE YOU EDIT BETWEEN PARTIES
js/main.js          renders content.js into the page and runs the countdown
assets/             favicon, gummy bear mark, Open Graph image
```

## Running the next party

Open `js/content.js`. Everything the site shows lives in one object.

1. Move the party that just happened into the `archive` array (newest first).
2. Write the next one into `party` — name, `volume`, `doors`/`endsAt` (ISO 8601
   **with a timezone offset**), venue, lineup, tiers, house rules.
3. Set `accent` to that party's colour. The entire site — buttons, ticker,
   headlines, glow — repaints around it, so each party looks like itself.
4. Update `ticketsLeft` as tickets sell. Under 50 the badge flips to
   `LAST TICKETS`; at `0` the whole page flips to sold out on its own.

**If there is no next party yet, set `party: null`.** The site then shows a
"NOT YET / nothing planned" page with the archive and the mailing list. That
state is part of the concept, not a broken page — don't invent a placeholder
party to fill it.

### The four states, handled automatically

| When | What the page becomes |
|---|---|
| Before doors | Countdown to doors, ticket tiers, `GET IN` |
| Between doors and `endsAt` | `HAPPENING NOW`, countdown to the end of the night |
| After `endsAt` | `IT'S OVER`, dead buttons, "nothing is planned" |
| `party: null` | `NOT YET` — archive and mailing list only |

The state is computed from the clock in the visitor's browser, so the page ages
correctly without anyone touching it.

## Things worth knowing

- **Mailing list.** `list.endpoint` is `null` by default, so the form hands the
  address to the visitor's mail client instead of pretending to subscribe them.
  Paste a Formspree / Buttondown / Netlify Forms URL into `list.endpoint` and
  the form POSTs there instead. (For Netlify Forms, also add `data-netlify="true"`
  and a `name` to the `<form>` in `index.html`.)
- **Add to calendar** builds an `.ics` file in the browser. No service involved.
- **Secret venue.** Set `venue.secret: true` and the address is replaced with
  "sent to ticket holders 24 hours before" everywhere it appears.
- **Fonts** are Anton + DM Mono from Google Fonts, with Impact / system mono
  fallbacks, so the layout survives if the CDN is blocked.
- **Motion, cookies, tracking.** All animation respects
  `prefers-reduced-motion`. There is no analytics, no cookie, no third-party
  script.
- **Social image** is `assets/og.png` (1200×630 at 2×). Re-make it per party if
  you want the shared link to match the poster.

## Deploying

- **Netlify / Vercel:** drag the folder into the dashboard. No build command,
  no output directory.
- **GitHub Pages:** push and point Pages at the branch root.
- Anywhere else: it's static files. Copy them to the web root.

The content in `js/content.js` is placeholder — party, venue, lineup and prices
are invented. Replace it with the real thing before going live.
