# The reservation desk

The site has no server. Reservations go straight into a Google Sheet you own,
through a small Google Apps Script. That script is `Code.gs` in this folder.

It takes about three minutes to set up, once.

## 1. Make the sheet

Go to [sheets.new](https://sheets.new) and name it something like
**Gummybears reservations**. Leave it empty — the script builds its own
columns the first time somebody reserves.

## 2. Paste in the script

In that sheet: **Extensions → Apps Script**. Delete whatever is in the editor,
paste the whole of `Code.gs`, and save (⌘/Ctrl + S).

At the top of the file, fill in:

```js
notifyEmail: 'you@example.com',   // where "somebody reserved" alerts go
```

`guestSubject` and `guestBody` are the email your guests get. Rewrite them
whenever you like — `{{name}}`, `{{ref}}`, `{{party}}`, `{{ticket}}` and
`{{quantity}}` get filled in.

## 3. Publish it

**Deploy → New deployment → ⚙ → Web app**, then:

| Field | Set it to |
|---|---|
| Description | anything |
| Execute as | **Me** |
| Who has access | **Anyone** |

Press **Deploy**. Google asks you to authorise it — it needs permission to
write to your sheet, save files to your Drive, and send email as you. Click
through the "unverified app" warning (it is unverified because it is yours,
and nobody reviewed it).

Copy the **Web app URL**. It ends in `/exec`.

> "Anyone" means anyone who has that URL can post a reservation. That is the
> point — your visitors are anonymous. The URL is inside the site's JavaScript,
> so treat it as public. The script drops obvious bot submissions, and you can
> always redeploy for a fresh URL.

## 4. Tell the site about it

Paste the URL into `src/content.ts`:

```ts
reservationEndpoint: 'https://script.google.com/macros/s/AKfy…/exec',
```

Push, and the site is live and taking reservations. (If you'd rather not
commit the URL, set a repository variable named `RESERVATION_ENDPOINT`
instead — the Pages workflow passes it in at build time.)

## What happens on each reservation

1. The screenshot is saved to a Drive folder called
   **Gummybears — payment receipts**.
2. A row is appended: received time, reference, **STATUS**, name, phone,
   email, ticket, quantity, amount, a link to the screenshot, their note.
3. The guest gets the "we got it" email.
4. You get an alert email with a link straight to the receipt.

## Confirming people

Open the sheet and change the **STATUS** cell:

- `PENDING` — new, needs checking (yellow)
- `CONFIRMED` — transfer checked, they're in (green)
- `REJECTED` — no transfer arrived, or it's wrong (red)

`REJECTED` rows stop counting against capacity, so the ticket goes back on
sale automatically. Nothing else reads that column — telling the guest they're
confirmed is still your email to write.

## Changing the emails later

Edit `guestBody` in the Apps Script editor, save, then **Deploy → Manage
deployments → ✏️ → Version: New version → Deploy**. Editing without
redeploying changes nothing on the live URL — that catches everyone once.
