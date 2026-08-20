#!/usr/bin/env bash
# Scaffold a new site by cloning apps/example-site.
# Usage: ./scripts/new-site.sh <site-name>
set -euo pipefail

name="${1:-}"
if [[ -z "$name" ]]; then
  echo "Usage: $0 <site-name>  (lowercase letters, numbers, hyphens)" >&2
  exit 1
fi
if [[ ! "$name" =~ ^[a-z0-9-]+$ ]]; then
  echo "Error: site name must match ^[a-z0-9-]+$" >&2
  exit 1
fi

root="$(cd "$(dirname "$0")/.." && pwd)"
src="$root/apps/example-site"
dest="$root/apps/$name"

if [[ -d "$dest" ]]; then
  echo "Error: $dest already exists" >&2
  exit 1
fi

mkdir -p "$dest"
# Copy source only; build/dep artifacts are recreated by pnpm install + build.
cp -R "$src/src" "$dest/src"
cp "$src/astro.config.mjs" "$src/tsconfig.json" "$src/netlify.toml" "$src/vercel.json" "$src/.env.example" "$dest/"

# Rewrite the package name in the new app's package.json.
sed "s/\"name\": \"example-site\"/\"name\": \"$name\"/" "$src/package.json" > "$dest/package.json"

echo "Created apps/$name"
echo "Next:"
echo "  1. Edit apps/$name/src/site.ts and pages."
echo "  2. Run: pnpm install"
echo "  3. Run: pnpm --filter $name dev"
