-- GUMMYBEARS — Supabase schema
--
-- Run this once in the Supabase dashboard: SQL Editor → New query → paste
-- this whole file → Run. It creates everything the site needs: accounts,
-- the live-editable party details, the archive list, and reservations with
-- an accept/reject workflow for the admin panel.

-- ── accounts ────────────────────────────────────────────────────────────
-- One row per signup, linked 1:1 to Supabase's built-in auth.users. Login
-- uses a plain username, so signup stores it under a synthetic email
-- (see src/lib/auth.tsx) and this table is the place the real username and
-- the admin flag live.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Runs as the function owner (bypasses RLS internally), so policies that
-- call it don't recurse back into profiles' own RLS.
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

create policy "read own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "admins read all profiles" on public.profiles
  for select using (public.is_admin());
create policy "update own profile" on public.profiles
  for update using (auth.uid() = id);

-- Auto-creates the profile row the moment someone signs up, pulling the
-- username out of the metadata passed to supabase.auth.signUp().
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, new.raw_user_meta_data->>'username');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── the party ───────────────────────────────────────────────────────────
-- Single row (id is always 1). The admin panel edits this in place; the
-- site reads it live. is_active = false shows the "nothing planned" state.
create table public.party (
  id int primary key default 1,
  name text not null default '',
  subtitle text not null default '',
  accent text not null default '#ff2d3f',
  accent_ink text not null default '#12060a',
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null default now(),
  date_line text not null default '',
  time_line text not null default '',
  venue_name text not null default '',
  venue_area text not null default '',
  venue_address text not null default '',
  venue_map_url text not null default '',
  venue_secret boolean not null default false,
  venue_note text not null default '',
  capacity int not null default 0,
  tickets jsonb not null default '[]'::jsonb,
  rules jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint party_single_row check (id = 1)
);

alter table public.party enable row level security;
create policy "party is publicly readable" on public.party for select using (true);
create policy "admins manage party" on public.party for all
  using (public.is_admin()) with check (public.is_admin());

-- ── the archive ("GONE" section) ───────────────────────────────────────
create table public.archive (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  date_line text not null default '',
  venue text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table public.archive enable row level security;
create policy "archive is publicly readable" on public.archive for select using (true);
create policy "admins manage archive" on public.archive for all
  using (public.is_admin()) with check (public.is_admin());

-- ── reservations ────────────────────────────────────────────────────────
create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  /* References profiles, not auth.users directly — the admin panel asks
     PostgREST to embed profiles(username) alongside each reservation, which
     only works when there's a real foreign key straight to that table. */
  user_id uuid not null references public.profiles(id) on delete cascade,
  party_name text not null,
  ticket text not null,
  quantity int not null check (quantity between 1 and 10),
  amount numeric not null default 0,
  name text not null,
  phone text not null,
  email text not null,
  note text not null default '',
  receipt_path text,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'rejected')),
  created_at timestamptz not null default now()
);

alter table public.reservations enable row level security;
create policy "insert own reservation" on public.reservations
  for insert with check (auth.uid() = user_id);
create policy "read own reservations" on public.reservations
  for select using (auth.uid() = user_id);
create policy "admins read all reservations" on public.reservations
  for select using (public.is_admin());
create policy "admins update reservation status" on public.reservations
  for update using (public.is_admin());

-- ── payment receipts (Storage) ─────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

-- Objects are stored as "<user id>/<filename>" so the folder name itself
-- enforces who owns what.
create policy "upload own receipts" on storage.objects
  for insert with check (
    bucket_id = 'receipts' and auth.uid()::text = (storage.foldername(name))[1]
  );
create policy "read own receipts" on storage.objects
  for select using (
    bucket_id = 'receipts' and auth.uid()::text = (storage.foldername(name))[1]
  );
create policy "admins read all receipts" on storage.objects
  for select using (bucket_id = 'receipts' and public.is_admin());

-- ── seed data: today's party + the existing archive ────────────────────
insert into public.party (
  id, name, subtitle, accent, accent_ink, starts_at, ends_at, date_line, time_line,
  venue_name, venue_area, venue_address, venue_map_url, venue_secret, venue_note,
  capacity, tickets, rules, is_active
) values (
  1, 'PEGAJOSA YACHT PARTY', '', '#ff2d3f', '#12060a',
  '2026-09-03T21:00:00+03:00', '2026-09-04T02:00:00+03:00',
  'THU 3 SEP 2026', '21:00 – 02:00',
  'ZAMALEK', 'Cairo', '', '', false, '',
  100,
  '[{"name":"REGULAR","price":1000,"quantity":100}]'::jsonb,
  '["No tickets on the door.", "18+.", "BYOB."]'::jsonb,
  true
)
on conflict (id) do nothing;

insert into public.archive (name, sort_order) values
  ('TEDDY PENTHOUSE PARTY', 0),
  ('EID EVE', 1),
  ('THE GUMMY BEAR HOUSE PARTY SERIES', 2);

-- ── after running this script ──────────────────────────────────────────
-- 1. Authentication → Sign In / Providers → Email → turn OFF "Confirm
--    email" (accounts use a fake username-based email with no real inbox
--    behind it, so confirmation mail would go nowhere).
-- 2. Sign up once on the live site with whatever username you want as the
--    admin account, then run:
--      update public.profiles set is_admin = true where username = 'YOUR_USERNAME';
