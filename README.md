# income_apps

Starter repo for building **income-generating web apps**.

The first app is **LaunchList** — a launch-ready waitlist / early-access landing
page. It captures email signups, de-duplicates them, shows a live "people
joined" social-proof counter, and persists signups through a small JSON-backed
store. It's a common income pattern: validate demand and pre-sell before you
build the full product.

## Stack

- [Next.js](https://nextjs.org) 16 (App Router) + React 19
- TypeScript
- Tailwind CSS v4
- [Vitest](https://vitest.dev) for unit tests
- ESLint (`eslint-config-next`)

## Getting started

```bash
npm ci          # install dependencies
npm run dev     # start the dev server on http://localhost:3000
```

In Cloud Agents, `.cursor/environment.json` runs `npm ci` on setup and starts
`npm run dev` in a named `next-dev` terminal automatically.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server (http://localhost:3000) |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | Lint with ESLint |
| `npm test` | Run unit tests (Vitest) |

## How it works

- `src/app/page.tsx` — server component landing page; reads the current signup
  count and renders the hero, features, and the waitlist form.
- `src/components/WaitlistForm.tsx` — client component; posts to the API and
  shows the live count and confirmation.
- `src/app/api/waitlist/route.ts` — `GET` returns the count; `POST` validates
  and stores an email.
- `src/lib/waitlist.ts` — pure domain logic (`normalizeEmail`, `isValidEmail`,
  `addEmail`) plus a file-backed store written to `.data/waitlist.json`
  (git-ignored). The pure helpers are unit-tested in `src/lib/waitlist.test.ts`.

## API

```bash
# Get the current signup count
curl http://localhost:3000/api/waitlist

# Join the waitlist
curl -X POST http://localhost:3000/api/waitlist \
  -H 'Content-Type: application/json' \
  -d '{"email":"you@example.com"}'
```

Signups are stored locally in `.data/waitlist.json`. Swap the store in
`src/lib/waitlist.ts` for a database or email provider when you go to production.
