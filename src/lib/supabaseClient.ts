import { createClient } from '@supabase/supabase-js';

/* The anon key is a public, front-end key by design — Supabase enforces
   access with row-level security policies (see supabase/schema.sql), not by
   keeping this secret. Overridable at build time the same way
   VITE_RESERVATION_ENDPOINT overrides content.ts. */
const SUPABASE_URL =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ||
  'https://lpgrimrnfdnwgsepmits.supabase.co';

const SUPABASE_ANON_KEY =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxwZ3JpbXJuZmRud2dzZXBtaXRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc2NzgzOTIsImV4cCI6MjEwMzI1NDM5Mn0.5fFnwJ3fGoEuMh-b4EiAYJQSqrxBZ7qP0vEXEmYPPXM';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/** Accounts log in with a username, but Supabase Auth is email-based —
 *  so signup mints a fake, unreachable address from the username and that
 *  becomes the account's real identity behind the scenes. */
export function emailForUsername(username: string): string {
  const normalized = username.trim().toLowerCase().replace(/[^a-z0-9_.-]/g, '');
  return `${normalized}@users.gummybears.invalid`;
}
