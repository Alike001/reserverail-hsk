/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_HSK_MAINNET_RPC_URL?: string;
  readonly VITE_HSK_MAINNET_EXPLORER_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
