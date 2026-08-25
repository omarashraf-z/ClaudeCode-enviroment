/**
 * The reservation desk — now backed by Supabase (see supabase/schema.sql)
 * instead of the old Google Sheet. A reservation always belongs to a
 * signed-in account: the row it lands in records who submitted it, and the
 * admin panel's accept/reject decision is what makes it show up on that
 * account's "My tickets" page.
 */
import { supabase } from './lib/supabaseClient';
import { sendPendingEmail } from './lib/mailer';

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
}

export interface ReservationResult {
  ref: string;
  simulated: false;
}

export class ReservationError extends Error {}

/** Short and easy to read aloud — avoids characters that look alike (0/O,
 *  1/I) since a guest might need to say this on the door. */
function makeRef(): string {
  const alphabet = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  let out = '';
  for (let i = 0; i < 5; i++) out += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  return 'GB-' + out;
}

/** Screenshots off a phone are 3–8 MB. Nobody needs that, and the upload has
 *  to survive a bad signal outside a venue, so shrink it first. */
const MAX_EDGE = 1600;
const MAX_BYTES = 8 * 1024 * 1024;

/** Returns the original file when the browser cannot decode it (an HEIC
 *  photo, say) or it is already small — then we upload the original bytes. */
async function shrink(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 1_500_000) {
      bitmap.close();
      return file;
    }
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext('2d');
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.82)
    );
    return blob ? new File([blob], file.name, { type: 'image/jpeg' }) : file;
  } catch {
    return file;
  }
}

export async function submitReservation(
  input: ReservationInput,
  userId: string
): Promise<ReservationResult> {
  const receipt = await shrink(input.receipt);
  if (receipt.size > MAX_BYTES) {
    throw new ReservationError('That image is too big — try a screenshot instead of a photo.');
  }

  const extension = (receipt.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;

  const upload = await supabase.storage.from('receipts').upload(path, receipt, {
    contentType: receipt.type || 'image/jpeg'
  });
  if (upload.error) {
    throw new ReservationError('Could not upload the screenshot. Check your connection and try again.');
  }

  const ref = makeRef();
  const { error } = await supabase.from('reservations').insert({
    user_id: userId,
    ref,
    party_name: input.party,
    ticket: input.ticket,
    quantity: input.quantity,
    amount: input.amount,
    name: input.name,
    phone: input.phone,
    email: input.email,
    note: input.note,
    receipt_path: path
  });

  if (error) {
    throw new ReservationError('That did not go through. Try again.');
  }

  await sendPendingEmail({
    name: input.name,
    email: input.email,
    party: input.party,
    ref,
    ticket: input.ticket,
    quantity: input.quantity
  });

  return { ref, simulated: false };
}

/** How many of each ticket type are already spoken for, for THIS party only
 *  — pending and confirmed both hold a spot; only a rejection frees it. */
export async function fetchTaken(party: string): Promise<Record<string, number> | null> {
  const { data, error } = await supabase
    .from('reservations')
    .select('ticket, quantity')
    .eq('party_name', party)
    .neq('status', 'rejected');
  if (error || !data) return null;

  const taken: Record<string, number> = {};
  for (const row of data) {
    taken[row.ticket] = (taken[row.ticket] ?? 0) + row.quantity;
  }
  return taken;
}

export interface MyReservation {
  id: string;
  ref: string;
  partyName: string;
  ticket: string;
  quantity: number;
  amount: number;
  status: 'pending' | 'confirmed' | 'rejected';
  createdAt: string;
}

export async function fetchMyReservations(userId: string): Promise<MyReservation[]> {
  const { data, error } = await supabase
    .from('reservations')
    .select('id, ref, party_name, ticket, quantity, amount, status, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id,
    ref: row.ref,
    partyName: row.party_name,
    ticket: row.ticket,
    quantity: row.quantity,
    amount: row.amount,
    status: row.status,
    createdAt: row.created_at
  }));
}
