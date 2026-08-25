import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { withTimeout } from './timeout';
import type { Party, TicketType } from '../content';

export interface ArchiveEntry {
  id: string;
  name: string;
  dateLine?: string;
  venue?: string;
}

interface PartyRow {
  name: string;
  subtitle: string;
  accent: string;
  accent_ink: string;
  starts_at: string;
  ends_at: string;
  date_line: string;
  time_line: string;
  venue_name: string;
  venue_area: string;
  venue_address: string;
  venue_map_url: string;
  venue_secret: boolean;
  venue_note: string;
  capacity: number;
  tickets: TicketType[];
  rules: string[];
  is_active: boolean;
}

function toParty(row: PartyRow): Party {
  return {
    name: row.name,
    subtitle: row.subtitle,
    accent: row.accent,
    accentInk: row.accent_ink,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    dateLine: row.date_line,
    timeLine: row.time_line,
    venue: {
      name: row.venue_name,
      area: row.venue_area,
      address: row.venue_address,
      mapUrl: row.venue_map_url,
      secret: row.venue_secret,
      note: row.venue_note
    },
    capacity: row.capacity,
    tickets: row.tickets ?? [],
    rules: row.rules ?? []
  };
}

/** Party details + the archive list, read live from Supabase. `party` is
 *  null both while loading and whenever the admin has switched it off
 *  (is_active = false) — callers already treat "no party" as the quiet
 *  state, so the two cases render the same way. */
export function usePartyData() {
  const [party, setParty] = useState<Party | null>(null);
  const [archive, setArchive] = useState<ArchiveEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    /* Best effort, same as the rest of the site's data fetches: a slow or
       unreachable Supabase project should fall back to "no party" rather
       than leave the page stuck on "Loading…" forever. */
    void withTimeout(
      Promise.all([
        supabase.from('party').select('*').eq('id', 1).maybeSingle(),
        supabase.from('archive').select('id, name, date_line, venue').order('sort_order')
      ]),
      10000
    )
      .then(([partyResult, archiveResult]) => {
        if (cancelled) return;
        const row = partyResult.data as PartyRow | null;
        setParty(row && row.is_active ? toParty(row) : null);
        setArchive(
          (archiveResult.data ?? []).map((entry) => ({
            id: entry.id,
            name: entry.name,
            dateLine: entry.date_line || undefined,
            venue: entry.venue || undefined
          }))
        );
      })
      .catch(() => {
        if (cancelled) return;
        setParty(null);
        setArchive([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return { party, archive, loading, refresh: () => setRefreshKey((n) => n + 1) };
}

export interface PartyUpdate {
  name: string;
  subtitle: string;
  accent: string;
  accentInk: string;
  startsAt: string;
  endsAt: string;
  dateLine: string;
  timeLine: string;
  venueName: string;
  venueArea: string;
  venueAddress: string;
  venueMapUrl: string;
  venueSecret: boolean;
  venueNote: string;
  capacity: number;
  tickets: TicketType[];
  rules: string[];
  isActive: boolean;
}

export async function saveParty(update: PartyUpdate): Promise<void> {
  const { error } = await supabase
    .from('party')
    .update({
      name: update.name,
      subtitle: update.subtitle,
      accent: update.accent,
      accent_ink: update.accentInk,
      starts_at: update.startsAt,
      ends_at: update.endsAt,
      date_line: update.dateLine,
      time_line: update.timeLine,
      venue_name: update.venueName,
      venue_area: update.venueArea,
      venue_address: update.venueAddress,
      venue_map_url: update.venueMapUrl,
      venue_secret: update.venueSecret,
      venue_note: update.venueNote,
      capacity: update.capacity,
      tickets: update.tickets,
      rules: update.rules,
      is_active: update.isActive,
      updated_at: new Date().toISOString()
    })
    .eq('id', 1);
  if (error) throw new Error(error.message);
}

/** Raw row shape for the admin editor, which needs is_active and the DB's
 *  own field names rather than the public-facing Party type. */
export async function fetchPartyForAdmin(): Promise<PartyUpdate | null> {
  const { data } = await supabase.from('party').select('*').eq('id', 1).maybeSingle();
  if (!data) return null;
  const row = data as PartyRow;
  return {
    name: row.name,
    subtitle: row.subtitle,
    accent: row.accent,
    accentInk: row.accent_ink,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    dateLine: row.date_line,
    timeLine: row.time_line,
    venueName: row.venue_name,
    venueArea: row.venue_area,
    venueAddress: row.venue_address,
    venueMapUrl: row.venue_map_url,
    venueSecret: row.venue_secret,
    venueNote: row.venue_note,
    capacity: row.capacity,
    tickets: row.tickets ?? [],
    rules: row.rules ?? [],
    isActive: row.is_active
  };
}

export async function addArchiveEntry(name: string): Promise<void> {
  const { data } = await supabase.from('archive').select('sort_order').order('sort_order', { ascending: false }).limit(1);
  const nextOrder = (data?.[0]?.sort_order ?? -1) + 1;
  const { error } = await supabase.from('archive').insert({ name, sort_order: nextOrder });
  if (error) throw new Error(error.message);
}

export async function deleteArchiveEntry(id: string): Promise<void> {
  const { error } = await supabase.from('archive').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
