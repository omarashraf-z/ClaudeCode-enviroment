import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import { after, before, describe, it } from 'node:test';
import { createApp } from './app.js';
import { config } from './config.js';
import { freshDb, type Fixture } from './testkit.js';
import { verifyStripeWebhook } from './payments.js';
import { issueSession, verifySession } from './auth.js';

let base = '';
let server: ReturnType<ReturnType<typeof createApp>['listen']>;
let fixture: Fixture;

before(async () => {
  fixture = freshDb();
  server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(() => {
  server.close();
});

const json = async (path: string, init?: RequestInit) => {
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) }
  });
  return { status: response.status, body: (await response.json()) as any, response };
};

describe('public api', () => {
  it('serves the current party with live remaining counts', async () => {
    const { status, body } = await json('/api/party');
    assert.equal(status, 200);
    assert.equal(body.party.name, 'TEST PARTY');
    assert.equal(body.party.venue.address, '1 Test Street');
    assert.equal(body.party.tiers.length, 3);
    assert.equal(body.party.ticketsLeft > 0, true);
  });

  it('books a ticket end to end and shows it by reference', async () => {
    const created = await json('/api/bookings', {
      method: 'POST',
      body: JSON.stringify({
        tierId: fixture.cheapTierId,
        name: 'Grace Hopper',
        email: 'grace@example.com',
        quantity: 2
      })
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.status, 'confirmed');
    assert.equal(created.body.amountCents, 3000);
    assert.equal(created.body.payAtDoor, true, 'the mock provider means pay on the night');

    const ticket = await json(`/api/bookings/${created.body.ref}`);
    assert.equal(ticket.status, 200);
    assert.equal(ticket.body.name, 'Grace Hopper');
    assert.equal(ticket.body.quantity, 2);
    assert.equal(ticket.body.party.name, 'TEST PARTY');

    /* Lower case and no dashes, the way somebody would type it off a phone. */
    const messy = await json(`/api/bookings/${created.body.ref.replace(/-/g, '').toLowerCase()}`);
    assert.equal(messy.status, 200);
  });

  it('rejects rubbish input and unknown references', async () => {
    const bad = await json('/api/bookings', {
      method: 'POST',
      body: JSON.stringify({ tierId: fixture.cheapTierId, name: 'x', email: 'nope', quantity: 0 })
    });
    assert.equal(bad.status, 400);

    const missing = await json('/api/bookings/GB-XXXX-XXXX');
    assert.equal(missing.status, 404);
  });

  it('refuses to sell a sold-out tier over http', async () => {
    const body = JSON.stringify({
      tierId: fixture.tinyTierId,
      name: 'Katherine Johnson',
      email: 'kj@example.com',
      quantity: 4
    });
    const first = await json('/api/bookings', { method: 'POST', body });
    assert.equal(first.status, 201);

    const second = await json('/api/bookings', { method: 'POST', body });
    assert.equal(second.status, 409);
    assert.equal(second.body.code, 'not_enough_left');
  });
});

describe('admin api', () => {
  let cookie = '';

  it('locks everything behind a password', async () => {
    const denied = await json('/api/admin/parties');
    assert.equal(denied.status, 401);

    const wrong = await json('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ password: 'not-it' })
    });
    assert.equal(wrong.status, 401);
  });

  it('signs in and lists parties, bookings and stats', async () => {
    const login = await json('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ password: config.admin.password })
    });
    assert.equal(login.status, 200);
    cookie = login.response.headers.get('set-cookie')?.split(';')[0] ?? '';
    assert.ok(cookie.startsWith('gb_admin='));

    const parties = await json('/api/admin/parties', { headers: { cookie } });
    assert.equal(parties.status, 200);
    assert.equal(parties.body.parties[0].name, 'TEST PARTY');

    const bookings = await json(`/api/admin/parties/${fixture.partyId}/bookings`, {
      headers: { cookie }
    });
    assert.equal(bookings.status, 200);
    assert.ok(bookings.body.bookings.length >= 2);
    assert.equal(bookings.body.stats.capacity, 100);
  });

  it('checks people in at the door, once', async () => {
    const created = await json('/api/bookings', {
      method: 'POST',
      body: JSON.stringify({
        tierId: fixture.cheapTierId,
        name: 'Door Test',
        email: 'door@example.com',
        quantity: 1
      })
    });

    const first = await json('/api/admin/checkin', {
      method: 'POST',
      headers: { cookie },
      body: JSON.stringify({ ref: created.body.ref })
    });
    assert.equal(first.status, 200);
    assert.equal(first.body.alreadyIn, false);

    const second = await json('/api/admin/checkin', {
      method: 'POST',
      headers: { cookie },
      body: JSON.stringify({ ref: created.body.ref.toLowerCase() })
    });
    assert.equal(second.body.alreadyIn, true);
  });

  it('keeps THE RULE when publishing a second party', async () => {
    const draft = await json('/api/admin/parties', {
      method: 'POST',
      headers: { cookie },
      body: JSON.stringify({
        name: 'NEXT ONE',
        volume: 2,
        doorsAt: '2027-01-01T23:00:00+01:00',
        endsAt: '2027-01-02T07:00:00+01:00',
        dateLine: 'FRI 1 JAN 2027',
        timeLine: '23:00 – 07:00',
        venue: { name: 'ELSEWHERE', area: 'Berlin' },
        capacity: 200,
        tiers: [{ name: 'FIRST', priceCents: 1000, quantity: 100 }]
      })
    });
    assert.equal(draft.status, 201);

    const blocked = await json(`/api/admin/parties/${draft.body.id}/publish`, {
      method: 'POST',
      headers: { cookie }
    });
    assert.equal(blocked.status, 409);
    assert.equal(blocked.body.code, 'one_party_at_a_time');

    /* End the current one, and the next one can go live. */
    await json(`/api/admin/parties/${fixture.partyId}/archive`, { method: 'POST', headers: { cookie } });
    const published = await json(`/api/admin/parties/${draft.body.id}/publish`, {
      method: 'POST',
      headers: { cookie }
    });
    assert.equal(published.status, 200);

    const home = await json('/api/party');
    assert.equal(home.body.party.name, 'NEXT ONE');
    assert.ok(home.body.archive.some((p: { name: string }) => p.name === 'TEST PARTY'));
  });
});

describe('sessions', () => {
  it('accepts its own token and rejects a doctored one', () => {
    const { token } = issueSession();
    assert.equal(verifySession(token), true);
    assert.equal(verifySession(`${token}x`), false);
    assert.equal(verifySession('garbage'), false);
    assert.equal(verifySession(undefined), false);
  });
});

describe('stripe webhooks', () => {
  const secret = 'whsec_test_secret';
  const payload = Buffer.from(JSON.stringify({ type: 'checkout.session.completed', data: { object: {} } }));

  it('accepts a correctly signed event and rejects everything else', () => {
    config.payments.stripeWebhookSecret = secret;
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = createHmac('sha256', secret)
      .update(`${timestamp}.${payload.toString('utf8')}`)
      .digest('hex');

    assert.ok(verifyStripeWebhook(payload, `t=${timestamp},v1=${signature}`));
    assert.equal(verifyStripeWebhook(payload, `t=${timestamp},v1=deadbeef`), null);
    assert.equal(verifyStripeWebhook(payload, undefined), null);

    /* An old signature is a replay, even if the maths checks out. */
    const stale = timestamp - 4000;
    const staleSignature = createHmac('sha256', secret)
      .update(`${stale}.${payload.toString('utf8')}`)
      .digest('hex');
    assert.equal(verifyStripeWebhook(payload, `t=${stale},v1=${staleSignature}`), null);

    config.payments.stripeWebhookSecret = '';
  });
});
