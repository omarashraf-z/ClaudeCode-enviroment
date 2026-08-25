/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** '1' builds a static demo that talks to an in-browser backend. */
  readonly VITE_DEMO?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
