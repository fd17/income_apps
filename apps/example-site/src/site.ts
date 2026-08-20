import type { SiteMeta } from '@repo/ui/config';

export const site: SiteMeta = {
  name: 'Example Site',
  tagline: 'A starter website in the income-apps monorepo',
  url: process.env.SITE_URL ?? 'https://example.com',
};
