# income_apps

A monorepo for building and deploying **multiple income‑generating websites** (sales
pages, donation/landing pages, small products) — all from one place, and deployable to
**free hosting providers**.

The apps themselves come later. This repo is the _environment_: shared code, one command
to build every site, and ready‑to‑use deploy pipelines for free hosts.

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
│   └── example-site/        # a starter website (copy this to add more)
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
pnpm dev            # run every site's dev server (example-site → http://localhost:4321)
pnpm build          # build every site to <app>/dist
pnpm check          # type-check every site/package
pnpm lint           # prettier --check
pnpm format         # prettier --write
```

Run a single site with pnpm filters, e.g. `pnpm --filter example-site dev`.

## Add a new site

```bash
./scripts/new-site.sh my-new-site   # clones apps/example-site → apps/my-new-site
pnpm install
pnpm --filter my-new-site dev
```

Anything under `apps/*` is picked up automatically by install, build, and the deploy
workflows.

## Deploy (free providers)

Every site builds to a static bundle in `apps/<app>/dist`, which any static host can
serve. Pipelines are included for the main free options:

| Provider             | How                                                                                                              | Best for                               |
| -------------------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| **Cloudflare Pages** | `.github/workflows/deploy-cloudflare-pages.yml` (needs `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` secrets) | Many sites from one repo (recommended) |
| **GitHub Pages**     | `.github/workflows/deploy-github-pages.yml` (no secrets)                                                         | One primary site, zero setup           |
| **Netlify**          | `apps/<app>/netlify.toml`                                                                                        | Per‑site, connect in Netlify UI        |
| **Vercel**           | `apps/<app>/vercel.json`                                                                                         | Per‑site, connect in Vercel UI         |

Cloudflare Pages allows an unlimited number of projects on its free tier, so it is the
recommended default when publishing several sites. GitHub Pages serves a single site per
repository — use it for the repo's primary site.

Each site's canonical URL and base path are configurable via `SITE_URL` and `BASE_PATH`
env vars (see `apps/example-site/.env.example`). The deploy workflows set these for you.

> Note: none of these run automatically on push. Deploy workflows are manual
> (`workflow_dispatch`) so you can enable a provider and add its credentials as GitHub
> **Secrets** first. CI (build/lint/type-check) runs on every push and PR.

## Cloud Agent environment

`.cursor/environment.json` configures Cursor Cloud Agents for this repo: it installs deps
(`pnpm install --frozen-lockfile`) and runs `pnpm dev` in a persistent terminal, exposing
`example-site` on port 4321.
