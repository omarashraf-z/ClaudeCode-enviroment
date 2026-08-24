import { config } from './config.js';
import type { BookingRow, PartyRow } from './types.js';

/**
 * Where a confirmation email would go out.
 *
 * There is no mail provider wired up, and rather than pretend otherwise this
 * logs the ticket link. To send for real, implement this one function with
 * your provider of choice (Resend, Postmark, SES, nodemailer + SMTP) — nothing
 * else in the codebase needs to change.
 */
export function sendBookingConfirmation(booking: BookingRow, party: PartyRow): void {
  const ticketUrl = `${config.webOrigin}/ticket/${booking.ref}`;
  console.log(
    `[booking] ${booking.ref} · ${booking.quantity}× ${party.name} · ${booking.email} · ${ticketUrl}`
  );
}
