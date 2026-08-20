# income_apps

A monorepo for building and deploying **multiple income‑generating websites** (sales
pages, donation/landing pages, small products) — all from one place, and deployable to
**free hosting providers**.

The first live product is **Billsnap**, a free freelancer invoice generator
(`apps/billsnap`). It is a static, no-signup tool with a $9 Pro unlock (watermark
removal) so it can earn immediately via SEO, then grow into invoicing + payments.

## Stack

| Concern            | Tool                                                             |
| ------------------ | ---------------------------------------------------------------- |
| Package manager    | [pnpm](https://pnpm.io) workspaces (pinned via `packageManager`) |
| Monorepo runner    | [Turborepo](https://turbo.build)                                 |
| Sites              | [Astro](https://astro.build) — static output, great for content  |
| Shared code        | `packages/ui` (layout, components, styling, helpers)             |
| Formatting / types | Prettier + `astro check` / `tsc`                                 |
| CI                 | GitHub Actions                                                   |

## Layout

```
income_apps/
├── apps/
│   ├── billsnap/            # invoice generator (Cloudflare Pages + custom domain)
│   └── example-site/        # starter website (copy this to add more)
├── packages/
│   └── ui/                  # shared layout, components, styles, helpers
├── scripts/new-site.sh      # scaffold a new site from example-site
├── .github/workflows/       # CI + deploy pipelines
├── turbo.json               # task graph
└── pnpm-workspace.yaml      # workspace globs (apps/*, packages/*)
```

## Getting started

```bash
pnpm install        # install all workspace deps
pnpm dev            # run every site's dev server (example-site → :4321, billsnap → :4322)
pnpm test           # unit tests (Billsnap invoice math)
pnpm build          # build every site to <app>/dist
pnpm check          # type-check every site/package
pnpm lint           # prettier --check
pnpm format         # prettier --write
```

Run a single site with pnpm filters, e.g. `pnpm --filter billsnap dev`
(http://localhost:4322) or `pnpm --filter example-site dev`.

## Billsnap

A browser-only invoice generator aimed at the “free invoice generator” search:

- Create / preview / Print-to-PDF, with tax, discounts, currencies, and a logo
- Drafts saved in `localStorage` (no backend, no account)
- Free plan includes a small Billsnap line on the PDF; Pro is a one-time $9 unlock
- Wire `PUBLIC_CHECKOUT_URL` to a Stripe Payment Link whose success URL is
  `/app/?unlocked=1` to start charging. Optional `PUBLIC_DONATE_URL` for a tip jar.
- Hosted on Cloudflare Pages with a custom domain (not GitHub Pages).

```bash
pnpm --filter billsnap test   # invoice math
pnpm --filter billsnap dev    # http://localhost:4322
```

## Add a new site

```bash
./scripts/new-site.sh my-new-site   # clones apps/example-site → apps/my-new-site
pnpm install
pnpm --filter my-new-site dev
```

Anything under `apps/*` is picked up automatically by install, build, and the deploy
workflows.

## Deploy (custom domain, not GitHub Pages)

Billsnap is **not** published via GitHub Pages — `fd17.github.io` already uses that
slot. It deploys to **Cloudflare Pages** (free), which gives the project its own
hostname (`fd17-billsnap.pages.dev`) and a real custom domain on the free tier.

### One-time Cloudflare + DNS

1. Create a free [Cloudflare](https://dash.cloudflare.com/sign-up) account.
2. Add GitHub Actions **secrets** on this repo:
   - `CLOUDFLARE_API_TOKEN` — token with **Account / Cloudflare Pages / Edit**
   - `CLOUDFLARE_ACCOUNT_ID` — from the Cloudflare dashboard URL or Overview
3. Add GitHub Actions **variable** `BILLSNAP_SITE_URL` = `https://your-domain.tld`
   (no trailing slash).
4. Point DNS at the Pages project:

   | Name       | Type                       | Target                    |
   | ---------- | -------------------------- | ------------------------- |
   | `@` (apex) | CNAME (flattened) or ALIAS | `fd17-billsnap.pages.dev` |
   | `www`      | CNAME                      | `fd17-billsnap.pages.dev` |

   If the domain’s nameservers are on the same Cloudflare account, you can instead run:

   ```bash
   CLOUDFLARE_API_TOKEN=… CLOUDFLARE_ACCOUNT_ID=… \
     ./scripts/attach-billsnap-domain.sh your-domain.tld
   ```

Push to `main` (or run **Deploy Billsnap to Cloudflare Pages**) after the secrets
exist. Canonical URLs come from `BILLSNAP_SITE_URL` / `SITE_URL` (see
`apps/billsnap/.env.example`).

Netlify and Vercel configs remain under each app if you prefer those UIs instead.

CI (format, lint, type-check, tests, build) still runs on every push and PR.

## Cloud Agent environment

`.cursor/environment.json` configures Cursor Cloud Agents for this repo: it installs deps
(`pnpm install --frozen-lockfile`) and runs `pnpm dev` in a persistent terminal.
example-site is served on http://localhost:4321, billsnap on http://localhost:4322.
