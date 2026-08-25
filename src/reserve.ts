/**
 * Sending a reservation to the Google Sheet.
 *
 * The whole back end is a Google Apps Script web app (google-apps-script/).
 * We post JSON to it as text/plain on purpose: that counts as a "simple"
 * request, so the browser skips the CORS preflight that Apps Script cannot
 * answer. It is a real POST either way.
 */
import { SITE } from './content';

export interface ReservationInput {
  name: string;
  phone: string;
  email: string;
  quantity: number;
  ticket: string;
  amount: number;
  note: string;
  party: string;
  receipt: File;
  /** Honeypot. Real people never fill this in; bots fill in everything. */
  hp: string;
}

export interface ReservationResult {
  ref: string | null;
  /** true when no endpoint is configured, so nothing was actually sent. */
  simulated: boolean;
}

export class ReservationError extends Error {}

/** Screenshots off a phone are 3–8 MB. Nobody needs that, and the upload has
 *  to survive a bad signal outside a venue, so shrink it first. */
const MAX_EDGE = 1600;
const MAX_BYTES = 8 * 1024 * 1024;

async function toBase64Payload(file: File): Promise<{ data: string; type: string }> {
  const shrunk = await shrink(file);
  const source = shrunk ?? file;

  if (source.size > MAX_BYTES) {
    throw new ReservationError('That image is too big — try a screenshot instead of a photo.');
  }

  const buffer = await source.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return { data: btoa(binary), type: source.type || file.type || 'image/jpeg' };
}

/** Returns null when the browser cannot decode the image (an HEIC photo, say)
 *  — then we send the original bytes and let Drive deal with it. */
async function shrink(file: File): Promise<Blob | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 1_500_000) {
      bitmap.close();
      return null;
    }
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    return await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.82)
    );
  } catch {
    return null;
  }
}

export async function submitReservation(input: ReservationInput): Promise<ReservationResult> {
  const receipt = await toBase64Payload(input.receipt);

  if (!SITE.reservationEndpoint) {
    /* No desk wired up yet. Say so rather than faking a reservation. */
    return { ref: null, simulated: true };
  }

  let response: Response;
  try {
    response = await fetch(SITE.reservationEndpoint, {
      method: 'POST',
      /* text/plain keeps this a simple request — see the note at the top. */
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ ...input, receipt, receiptName: input.receipt.name })
    });
  } catch {
    throw new ReservationError('Could not reach us. Check your connection and try again.');
  }

  let payload: { ok?: boolean; ref?: string; error?: string };
  try {
    payload = (await response.json()) as typeof payload;
  } catch {
    throw new ReservationError('We could not read the reply. Message us on Instagram before trying again.');
  }

  if (!payload.ok) throw new ReservationError(payload.error ?? 'That did not go through.');
  return { ref: payload.ref ?? null, simulated: false };
}

/** How many of each ticket type are already spoken for, for THIS party only —
 *  the sheet keeps every party's rows. Best effort: if the desk is
 *  unreachable the site simply doesn't show a counter. */
export async function fetchTaken(party: string): Promise<Record<string, number> | null> {
  if (!SITE.reservationEndpoint) return null;
  try {
    const url =
      SITE.reservationEndpoint +
      (SITE.reservationEndpoint.includes('?') ? '&' : '?') +
      'party=' + encodeURIComponent(party);
    const response = await fetch(url, { method: 'GET' });
    const payload = (await response.json()) as { ok?: boolean; taken?: Record<string, number> };
    return payload.ok && payload.taken ? payload.taken : null;
  } catch {
    return null;
  }
}
