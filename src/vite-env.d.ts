/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Overrides the Supabase project URL / anon key baked into
   *  src/lib/supabaseClient.ts. */
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** Overrides SITE.mailEndpoint at build time. */
  readonly VITE_MAIL_ENDPOINT?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
