/**
 * GUMMYBEARS — the reservation desk.
 *
 * This is the entire back end. It lives in a Google Sheet, so the sheet is
 * the database and you already know how to use it.
 *
 * What it does when somebody reserves:
 *   1. saves their InstaPay screenshot into a Drive folder
 *   2. appends a row to the sheet, status PENDING
 *   3. emails them "we got it, we'll confirm soon"
 *   4. emails you "somebody reserved", with a link to the receipt
 *
 * You confirm by changing the STATUS cell to CONFIRMED (or REJECTED). Nothing
 * else in the system needs to know — that column is only for you, except that
 * REJECTED rows stop counting against capacity.
 *
 * Setup lives in google-apps-script/README.md.
 */

const CONFIG = {
  /** Leave '' when this script lives INSIDE the sheet (Extensions → Apps
   *  Script). If you created it standalone at script.google.com instead, the
   *  script has no sheet of its own — paste the sheet's ID here. It is the
   *  long code in the sheet's URL:
   *  docs.google.com/spreadsheets/d/THIS_PART/edit */
  spreadsheetId: '',

  /** Tab the reservations land in. Created automatically. */
  sheetName: 'Reservations',
  /** Drive folder the screenshots land in. Created automatically. */
  receiptsFolder: 'Gummybears — payment receipts',
  /** Where the "somebody reserved" alert goes. Leave '' to skip it. */
  notifyEmail: '',
  brandName: 'GUMMYBEARS',

  /** The email the guest gets. Rewrite this whenever you like. */
  guestSubject: 'We got your reservation — GUMMYBEARS',
  guestBody:
    'Hi {{name}},\n\n' +
    'We have your reservation for {{party}} and your payment screenshot.\n' +
    'Reference: {{ref}} — {{quantity}} × {{ticket}}.\n\n' +
    'We check every transfer by hand, so give us a little time. You will get ' +
    'one more email from us once your spot is confirmed.\n\n' +
    '— ' + 'GUMMYBEARS'
};

const HEADERS = [
  'Received', 'Ref', 'Status', 'Name', 'Phone', 'Email',
  'Ticket', 'Quantity', 'Amount', 'Receipt', 'Note', 'Party'
];

/* ────────────────────────────────────────────────────────────────────────── */

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);

    /* Honeypot. A bot fills every field it finds; a person never sees this
       one. Answer as if all is well so it doesn't learn anything. */
    if (String(body.hp || '').length > 0) return json({ ok: true, ref: 'GB-OK' });

    const name = String(body.name || '').trim();
    const phone = String(body.phone || '').trim();
    const email = String(body.email || '').trim();
    const quantity = Math.trunc(Number(body.quantity));
    const ticket = String(body.ticket || '').trim();

    if (name.length < 2) return json({ ok: false, error: 'Name is missing.' });
    if (phone.length < 6) return json({ ok: false, error: 'Phone number is missing.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ ok: false, error: 'That email does not look right.' });
    if (!(quantity >= 1 && quantity <= 10)) return json({ ok: false, error: 'Odd number of tickets.' });
    if (!body.receipt || !body.receipt.data) return json({ ok: false, error: 'The payment screenshot is missing.' });

    /* One reservation at a time, so two people submitting together cannot
       land on the same row. */
    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      const receiptUrl = saveReceipt(body.receipt, name);
      const ref = makeRef();
      const sheet = getSheet();

      sheet.appendRow([
        new Date(),
        ref,
        'PENDING',
        name,
        "'" + phone,               // leading quote keeps +20… from becoming a number
        email,
        ticket,
        quantity,
        Number(body.amount) || '',
        receiptUrl,
        String(body.note || '').slice(0, 500),
        String(body.party || '')
      ]);

      notify(body, ref, receiptUrl);
      return json({ ok: true, ref: ref });
    } finally {
      lock.releaseLock();
    }
  } catch (error) {
    console.error(error);
    /* The detail is for whoever is setting this up — a guest never sees it
       unless something is genuinely broken, and then it is what fixes it. */
    return json({
      ok: false,
      error: 'Something broke on our side. Message us on Instagram.',
      detail: String(error && error.message ? error.message : error)
    });
  }
}

/** The site asks how many are gone, so it can show "x left" and sell out.
 *  ?party=NAME counts only that party's rows — the sheet keeps every party
 *  ever run, so without this the next party would start out sold out.
 *  ?ping=1 runs a self-test instead. */
function doGet(e) {
  if (e && e.parameter && e.parameter.ping) return ping();
  const wanted = (e && e.parameter && e.parameter.party) ? String(e.parameter.party) : '';

  try {
    const sheet = getSheet();
    const rows = sheet.getDataRange().getValues();
    const taken = {};
    let total = 0;

    for (let i = 1; i < rows.length; i++) {
      const status = String(rows[i][2] || '').toUpperCase();
      if (status === 'REJECTED') continue;          // freed up again
      if (wanted && String(rows[i][11] || '') !== wanted) continue;
      const ticket = String(rows[i][6] || '');
      const quantity = Number(rows[i][7]) || 0;
      taken[ticket] = (taken[ticket] || 0) + quantity;
      total += quantity;
    }
    return json({ ok: true, party: wanted, taken: taken, total: total });
  } catch (error) {
    console.error(error);
    return json({
      ok: false,
      error: 'Could not read the sheet.',
      detail: String(error && error.message ? error.message : error)
    });
  }
}

/** Self-test. Reads everything it needs and reports what worked. */
function ping() {
  const report = {
    ok: false,
    deployed: true,
    runningAs: '',
    spreadsheet: null,
    tab: null,
    rows: null,
    receiptsFolder: null,
    canSendEmail: null,
    problem: null
  };

  try {
    report.runningAs = Session.getEffectiveUser().getEmail();
  } catch (error) {
    report.runningAs = '(hidden)';
  }

  try {
    const book = getBook();
    report.spreadsheet = book.getName();

    const sheet = book.getSheetByName(CONFIG.sheetName);
    report.tab = sheet ? CONFIG.sheetName : '(not created yet — normal before the first reservation)';
    report.rows = sheet ? Math.max(0, sheet.getLastRow() - 1) : 0;

    const folders = DriveApp.getFoldersByName(CONFIG.receiptsFolder);
    report.receiptsFolder = folders.hasNext() ? 'exists' : '(not created yet — normal)';

    report.canSendEmail = MailApp.getRemainingDailyQuota() + ' emails left today';
    report.ok = true;
  } catch (error) {
    report.problem = String(error && error.message ? error.message : error);
  }

  return json(report);
}

/* ── helpers ─────────────────────────────────────────────────────────────── */

function getBook() {
  if (CONFIG.spreadsheetId) return SpreadsheetApp.openById(CONFIG.spreadsheetId);
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (!active) {
    throw new Error(
      'This script is not attached to a spreadsheet. Either create it from ' +
      'inside the sheet (Extensions → Apps Script), or set CONFIG.spreadsheetId.'
    );
  }
  return active;
}

function getSheet() {
  const book = getBook();
  let sheet = book.getSheetByName(CONFIG.sheetName);
  if (!sheet) sheet = book.insertSheet(CONFIG.sheetName);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(10, 260);                    // Receipt
    /* Colour the status column so a full sheet is scannable. */
    const status = sheet.getRange('C2:C1000');
    const rules = [
      SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('CONFIRMED')
        .setBackground('#d9ead3').setRanges([status]).build(),
      SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('PENDING')
        .setBackground('#fff2cc').setRanges([status]).build(),
      SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('REJECTED')
        .setBackground('#f4cccc').setRanges([status]).build()
    ];
    sheet.setConditionalFormatRules(rules);
  }
  return sheet;
}

function saveReceipt(receipt, name) {
  const folders = DriveApp.getFoldersByName(CONFIG.receiptsFolder);
  const folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(CONFIG.receiptsFolder);

  const type = String(receipt.type || 'image/jpeg');
  const extension = type.indexOf('png') > -1 ? 'png' : type.indexOf('webp') > -1 ? 'webp' : 'jpg';
  const stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HHmm');
  const safeName = name.replace(/[^\w \-]/g, '').slice(0, 40);

  const blob = Utilities.newBlob(
    Utilities.base64Decode(receipt.data),
    type,
    stamp + ' — ' + safeName + '.' + extension
  );
  return folder.createFile(blob).getUrl();
}

function makeRef() {
  const alphabet = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  let out = '';
  for (let i = 0; i < 5; i++) out += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  return 'GB-' + out;
}

function notify(body, ref, receiptUrl) {
  const fill = (text) => text
    .replace(/{{name}}/g, body.name)
    .replace(/{{ref}}/g, ref)
    .replace(/{{party}}/g, body.party || CONFIG.brandName)
    .replace(/{{ticket}}/g, body.ticket || '')
    .replace(/{{quantity}}/g, body.quantity);

  try {
    MailApp.sendEmail({
      to: body.email,
      subject: fill(CONFIG.guestSubject),
      body: fill(CONFIG.guestBody),
      name: CONFIG.brandName
    });
  } catch (error) {
    console.error('guest email failed', error);      // never lose the row over an email
  }

  if (!CONFIG.notifyEmail) return;
  try {
    MailApp.sendEmail({
      to: CONFIG.notifyEmail,
      subject: '[' + CONFIG.brandName + '] ' + body.quantity + ' × ' + body.ticket + ' — ' + body.name,
      body: [
        ref,
        body.name + ' · ' + body.phone + ' · ' + body.email,
        body.quantity + ' × ' + body.ticket + ' = ' + body.amount,
        body.note ? 'Note: ' + body.note : '',
        'Receipt: ' + receiptUrl,
        '',
        'Open the sheet to confirm: ' + SpreadsheetApp.getActiveSpreadsheet().getUrl()
      ].join('\n'),
      name: CONFIG.brandName
    });
  } catch (error) {
    console.error('owner email failed', error);
  }
}

function json(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
