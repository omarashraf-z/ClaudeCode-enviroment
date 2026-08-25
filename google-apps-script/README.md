# The mailer

Reservations, accounts, and the accept/reject decision all live in Supabase
(see `supabase/schema.sql`). This script does one small thing on top of
that: it sends the two emails a guest gets, because a browser can't send
mail as you on its own. That's `Code.gs` in this folder.

## Already have a deployment from before?

If this site had reservations flowing through a Google Sheet before, you
already have a script and a URL — you're just replacing what's *inside* the
script. Skip to **2. Paste in the script**, then **3. Redeploy** below. The
URL stays the same, so nothing else needs to change.

Starting fresh instead? It takes about two minutes.

## 1. Make the script

Go to [script.new](https://script.new). Any Google account works — it
doesn't need to be attached to a sheet.

## 2. Paste in the script

Delete whatever is in the editor, paste the whole of `Code.gs`, and save
(⌘/Ctrl + S).

`pendingSubject`/`pendingBody` and `confirmedSubject`/`confirmedBody` are
the two emails guests get. Rewrite them whenever you like —
`{{name}}`, `{{party}}`, `{{ref}}`, `{{ticket}}`, `{{quantity}}` and (in the
confirmed email only) `{{ticketUrl}}` get filled in.

## 3. Deploy (or redeploy)

**First time:** **Deploy → New deployment → ⚙ → Web app**, then:

| Field | Set it to |
|---|---|
| Description | anything |
| Execute as | **Me** |
| Who has access | **Anyone** |

Press **Deploy**. Google asks you to authorise it — it needs permission to
send email as you. Click through the "unverified app" warning (it is
unverified because it is yours, and nobody reviewed it). Copy the **Web app
URL** — it ends in `/exec`.

**Already deployed, just changed the script:** **Deploy → Manage
deployments → ✏️ → Version: New version → Deploy**. Editing the script
without redeploying changes nothing on the live URL — that catches everyone
once.

> "Anyone" means anyone who has that URL can ask it to send an email using
> this template. The URL is inside the site's JavaScript, so treat it as
> public — same as the reservation desk before it. If that ever becomes a
> problem, redeploy for a fresh URL.

## 4. Tell the site about it

Paste the URL into `src/content.ts`:

```ts
mailEndpoint: 'https://script.google.com/macros/s/AKfy…/exec',
```

Or set a repository variable named `MAIL_ENDPOINT` if you'd rather not
commit it, and pass it through the Pages workflow as `VITE_MAIL_ENDPOINT`.

Push, and reservations start sending mail.

## Checking it's working

Visit the web app URL in a browser with `?ping=1` on the end. You'll get
back JSON with `canSendEmail` — the number of emails left in your daily
quota. If that loads, the script can send mail.
