/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string
  readonly VITE_APP_VERSION: string
  readonly VITE_DEBUG_MODE: string
  readonly VITE_CHARACTER_CREATION_ENABLED: string
  // add more env variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
