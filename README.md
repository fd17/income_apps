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
- Free plan includes a Billsnap watermark with sendtheinvoice.com on the PDF; Pro is a one-time $9 unlock
- Wire `PUBLIC_CHECKOUT_URL` to a Stripe Payment Link (see **Stripe** below).
- Hosted at [sendtheinvoice.com](https://sendtheinvoice.com) on Cloudflare Pages.

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
slot. Production is **https://sendtheinvoice.com** on Cloudflare Pages (project
`fd17-billsnap`, also at `https://fd17-billsnap.pages.dev`).

Push to `main` deploys when repo secrets `CLOUDFLARE_API_TOKEN` and
`CLOUDFLARE_ACCOUNT_ID` are set. Canonical URLs use `SITE_URL` /
`BILLSNAP_SITE_URL`. The Pro button uses `PUBLIC_CHECKOUT_URL` (see Stripe below).

To attach another hostname on the same Cloudflare account (adds apex + www,
creates proxied CNAMEs to `fd17-billsnap.pages.dev`, and waits for SSL):

```bash
CLOUDFLARE_API_TOKEN=… CLOUDFLARE_ACCOUNT_ID=… \
  ./scripts/attach-billsnap-domain.sh other-domain.tld
```

Netlify and Vercel configs remain under each app if you prefer those UIs instead.

CI (format, lint, type-check, tests, build) still runs on every push and PR.

## Stripe (Pro unlock)

Billsnap has no backend. Stripe Checkout is a **Payment Link**; after pay, Stripe
sends the browser to `/app/?unlocked=1`, which sets Pro in `localStorage`.

1. Create a [Stripe account](https://dashboard.stripe.com/register) and complete
   activation if you want live charges (test mode works first).
2. **Product catalog → Add product**
   - Name: `Billsnap Pro`
   - One-time, **$9 USD** (not a recurring price)
3. **Payment links → New**
   - Product: Billsnap Pro, quantity 1
   - **After the payment → Confirmation page → Redirect to a URL**
   - URL: `https://sendtheinvoice.com/app/?unlocked=1`
4. Copy the link (`https://buy.stripe.com/...`).
5. Add a GitHub Actions **variable** (Settings → Secrets and variables → Actions → Variables):
   - `PUBLIC_CHECKOUT_URL` = that `buy.stripe.com` URL
6. Redeploy: merge to `main`, or run **Deploy Billsnap to Cloudflare Pages**.

Optional tip jar: another Payment Link (or Ko-fi) in variable `PUBLIC_DONATE_URL`.

This unlock is device-local on purpose (static hosting). Anyone who opens
`?unlocked=1` gets Pro in that browser. Fine for a $9 MVP; a signed Stripe session
would need a Worker or other backend.

## Cloud Agent environment

`.cursor/environment.json` configures Cursor Cloud Agents for this repo: it installs deps
(`pnpm install --frozen-lockfile`) and runs `pnpm dev` in a persistent terminal.
example-site is served on http://localhost:4321, billsnap on http://localhost:4322.
