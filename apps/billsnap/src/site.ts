import type { SiteMeta } from '@repo/ui/config';

export const site: SiteMeta = {
  name: 'Billsnap',
  tagline: 'Professional invoices in 30 seconds. Free, no signup.',
  url: process.env.SITE_URL ?? 'https://example.com',
};

/** One-time Pro price shown on the marketing pages. */
export const PRO_PRICE = '$9';

export const CHECKOUT_URL = import.meta.env.PUBLIC_CHECKOUT_URL ?? '';
export const DONATE_URL = import.meta.env.PUBLIC_DONATE_URL ?? '';
