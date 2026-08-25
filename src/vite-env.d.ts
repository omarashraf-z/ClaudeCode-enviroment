/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Overrides SITE.reservationEndpoint at build time. Handy for testing, and
   *  lets you keep the URL out of the repo if you'd rather set it in CI. */
  readonly VITE_RESERVATION_ENDPOINT?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
