/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LIVEKIT_URL: string;
  readonly VITE_LIVEKIT_TOKEN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
