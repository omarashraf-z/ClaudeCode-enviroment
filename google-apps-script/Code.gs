/**
 * GUMMYBEARS — the mailer.
 *
 * This script does exactly one thing: send the two emails a guest gets.
 * Reservations, accounts, and the accept/reject decision all live in
 * Supabase now — this is just the thing that knows how to send mail as you,
 * because a browser can't do that on its own.
 *
 * The site calls this twice per reservation:
 *   1. the moment someone reserves — "we got it, hang tight"
 *   2. the moment you hit ACCEPT in /admin — "you're confirmed", with a
 *      link to My Tickets
 *
 * Setup lives in google-apps-script/README.md.
 */

const CONFIG = {
  brandName: 'GUMMYBEARS',

  pendingSubject: 'We got your reservation — GUMMYBEARS',
  pendingBody:
    'Hi {{name}},\n\n' +
    'We have your reservation for {{party}} and your payment screenshot.\n' +
    'Reference: {{ref}} — {{quantity}} × {{ticket}}.\n\n' +
    'Give us a little time. You will get\n' +
    'a confirmation email from us once your spot is confirmed.\n\n' +
    '— ' + 'GUMMYBEARS',

  confirmedSubject: "You're confirmed — GUMMYBEARS",
  confirmedBody:
    'Hi {{name}},\n\n' +
    "You're confirmed for {{party}}.\n" +
    'Reference: {{ref}} — {{quantity}} × {{ticket}}.\n\n' +
    'See it here: {{ticketUrl}}\n\n' +
    '— ' + 'GUMMYBEARS'
};

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const type = String(body.type || '');
    const email = String(body.email || '').trim();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ ok: false, error: 'Missing or invalid email.' });
    }

    const fill = (text) =>
      text
        .replace(/{{name}}/g, body.name || '')
        .replace(/{{party}}/g, body.party || CONFIG.brandName)
        .replace(/{{ref}}/g, body.ref || '')
        .replace(/{{ticket}}/g, body.ticket || '')
        .replace(/{{quantity}}/g, body.quantity || '')
        .replace(/{{ticketUrl}}/g, body.ticketUrl || '');

    if (type === 'pending') {
      MailApp.sendEmail({
        to: email,
        subject: fill(CONFIG.pendingSubject),
        body: fill(CONFIG.pendingBody),
        name: CONFIG.brandName
      });
    } else if (type === 'confirmed') {
      MailApp.sendEmail({
        to: email,
        subject: fill(CONFIG.confirmedSubject),
        body: fill(CONFIG.confirmedBody),
        name: CONFIG.brandName
      });
    } else {
      return json({ ok: false, error: 'Unknown email type: ' + type });
    }

    return json({ ok: true });
  } catch (error) {
    console.error(error);
    return json({
      ok: false,
      error: String(error && error.message ? error.message : error)
    });
  }
}

/** Self-test: confirms the deployment can actually send mail today. */
function doGet(e) {
  if (e && e.parameter && e.parameter.ping) {
    let runningAs = '(hidden)';
    try {
      runningAs = Session.getEffectiveUser().getEmail();
    } catch (error) {
      // Apps Script hides this in some auth modes — not worth failing over.
    }
    return json({
      ok: true,
      runningAs: runningAs,
      canSendEmail: MailApp.getRemainingDailyQuota() + ' emails left today'
    });
  }
  return json({ ok: false, error: 'This endpoint only accepts POST.' });
}

function json(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON
  );
}
