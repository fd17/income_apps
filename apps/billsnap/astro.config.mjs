// @ts-check
import { defineConfig } from 'astro/config';

// `site` and `base` are read from the environment so the same build can target
// different free hosts (Cloudflare Pages / Netlify / Vercel use "/", GitHub
// Pages project sites use "/<repo>/"). See the repo README for details.
const site = process.env.SITE_URL ?? 'https://fd17-billsnap.pages.dev';
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  site,
  base,
  output: 'static',
});
