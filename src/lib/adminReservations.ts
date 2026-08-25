import { supabase } from './supabaseClient';

export interface AdminReservation {
  id: string;
  ref: string;
  username: string;
  partyName: string;
  ticket: string;
  quantity: number;
  amount: number;
  name: string;
  phone: string;
  email: string;
  note: string;
  receiptUrl: string | null;
  status: 'pending' | 'confirmed' | 'rejected';
  createdAt: string;
}

export async function fetchAllReservations(): Promise<AdminReservation[]> {
  const { data, error } = await supabase
    .from('reservations')
    .select('id, ref, party_name, ticket, quantity, amount, name, phone, email, note, receipt_path, status, created_at, profiles(username)')
    .order('created_at', { ascending: false });
  if (error || !data) return [];

  const withUrls = await Promise.all(
    data.map(async (row) => {
      let receiptUrl: string | null = null;
      if (row.receipt_path) {
        const signed = await supabase.storage
          .from('receipts')
          .createSignedUrl(row.receipt_path, 60 * 60);
        receiptUrl = signed.data?.signedUrl ?? null;
      }
      const profile = row.profiles as unknown as { username: string } | { username: string }[] | null;
      const username = Array.isArray(profile) ? profile[0]?.username : profile?.username;
      return {
        id: row.id,
        ref: row.ref,
        username: username ?? '(unknown)',
        partyName: row.party_name,
        ticket: row.ticket,
        quantity: row.quantity,
        amount: row.amount,
        name: row.name,
        phone: row.phone,
        email: row.email,
        note: row.note,
        receiptUrl,
        status: row.status,
        createdAt: row.created_at
      };
    })
  );
  return withUrls;
}

export async function setReservationStatus(
  id: string,
  status: 'pending' | 'confirmed' | 'rejected'
): Promise<void> {
  const { error } = await supabase.from('reservations').update({ status }).eq('id', id);
  if (error) throw new Error(error.message);
}

export async function deleteReservation(id: string): Promise<void> {
  const { error } = await supabase.from('reservations').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
