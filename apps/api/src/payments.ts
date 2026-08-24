import { createHmac, timingSafeEqual } from 'node:crypto';
import { config } from './config.js';
import type { BookingRow, PartyRow, TierRow } from './types.js';

export interface CheckoutRequest {
  booking: BookingRow;
  party: PartyRow;
  tier: TierRow;
}

export interface CheckoutResult {
  /** Where to send the buyer. null means there is nothing to pay. */
  url: string | null;
  paymentRef: string | null;
}

/**
 * Two providers.
 *
 *  mock   — no money moves. The booking is confirmed immediately and the
 *           ticket says "pay at the door". This is the default so the app
 *           runs end to end with no accounts and no keys.
 *  stripe — a real Stripe Checkout Session over the REST API (no SDK
 *           dependency). Needs STRIPE_SECRET_KEY, and the webhook below
 *           needs STRIPE_WEBHOOK_SECRET.
 */
export async function startCheckout(input: CheckoutRequest): Promise<CheckoutResult> {
  if (config.payments.provider === 'mock' || input.booking.amount_cents === 0) {
    return { url: null, paymentRef: null };
  }
  return startStripeCheckout(input);
}

async function startStripeCheckout({
  booking,
  party,
  tier
}: CheckoutRequest): Promise<CheckoutResult> {
  if (!config.payments.stripeSecretKey) {
    throw new Error('PAYMENT_PROVIDER=stripe but STRIPE_SECRET_KEY is not set.');
  }

  const body = new URLSearchParams({
    mode: 'payment',
    success_url: `${config.webOrigin}/ticket/${booking.ref}`,
    cancel_url: `${config.webOrigin}/book?cancelled=${booking.ref}`,
    client_reference_id: booking.ref,
    customer_email: booking.email,
    'metadata[booking_ref]': booking.ref,
    'line_items[0][quantity]': String(booking.quantity),
    'line_items[0][price_data][currency]': tier.currency.toLowerCase(),
    'line_items[0][price_data][unit_amount]': String(tier.price_cents),
    'line_items[0][price_data][product_data][name]': `GUMMYBEARS — ${party.name} · ${tier.name}`
  });

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.payments.stripeSecretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      /* Retrying a failed create must not create a second session. */
      'Idempotency-Key': `booking-${booking.ref}`
    },
    body
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Stripe rejected the checkout session: ${response.status} ${detail}`);
  }

  const session = (await response.json()) as { id: string; url: string };
  return { url: session.url, paymentRef: session.id };
}

export interface StripeEvent {
  type: string;
  data: { object: Record<string, unknown> };
}

/**
 * Verify a Stripe webhook signature by hand (t=…,v1=… over `${t}.${payload}`).
 * Returns the parsed event, or null if the signature does not check out.
 */
export function verifyStripeWebhook(
  rawBody: Buffer,
  signatureHeader: string | undefined,
  toleranceSeconds = 300,
  now = Date.now()
): StripeEvent | null {
  const secret = config.payments.stripeWebhookSecret;
  if (!secret || !signatureHeader) return null;

  const parts = Object.fromEntries(
    signatureHeader.split(',').map((piece) => {
      const [key, ...rest] = piece.split('=');
      return [key?.trim() ?? '', rest.join('=')];
    })
  );
  const timestamp = parts['t'];
  const provided = parts['v1'];
  if (!timestamp || !provided) return null;

  const age = Math.abs(now / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > toleranceSeconds) return null;

  const expected = createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody.toString('utf8')}`)
    .digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(provided);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    return JSON.parse(rawBody.toString('utf8')) as StripeEvent;
  } catch {
    return null;
  }
}
