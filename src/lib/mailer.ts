/**
 * The two guest emails — "we got your reservation" and "you're confirmed" —
 * sent by posting to the Google Apps Script mailer (google-apps-script/).
 * Best effort throughout: a missed email should never block a reservation
 * being created or an admin's accept/reject decision from taking effect.
 */
import { SITE } from '../content';

export interface MailPayload {
  name: string;
  email: string;
  party: string;
  ref: string;
  ticket: string;
  quantity: number;
  /** Only used by the "confirmed" email. */
  ticketUrl?: string;
}

async function send(type: 'pending' | 'confirmed', payload: MailPayload): Promise<void> {
  if (!SITE.mailEndpoint) return;
  try {
    /* text/plain keeps this a "simple" request, so the browser skips the
       CORS preflight that Apps Script cannot answer. It is a real POST
       either way. */
    await fetch(SITE.mailEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ type, ...payload })
    });
  } catch {
    /* Nothing to do — the guest still has their reservation either way. */
  }
}

export const sendPendingEmail = (payload: MailPayload) => send('pending', payload);
export const sendConfirmedEmail = (payload: MailPayload) => send('confirmed', payload);

/** Where "My Tickets" lives, from wherever the site happens to be hosted —
 *  works the same on GitHub Pages, a preview build, or localhost. */
export function myTicketsUrl(): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}#/my-tickets`;
}
