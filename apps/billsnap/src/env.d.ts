/// <reference path="../.astro/types.d.ts" />

interface ImportMetaEnv {
  readonly PUBLIC_CHECKOUT_URL?: string;
  readonly PUBLIC_DONATE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
