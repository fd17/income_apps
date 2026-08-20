#!/usr/bin/env bash
# Attach an apex or www hostname to the Cloudflare Pages project.
# Usage:
#   CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... \
#     ./scripts/attach-billsnap-domain.sh your-domain.tld
set -euo pipefail

domain="${1:-}"
if [[ -z "$domain" ]]; then
  echo "Usage: $0 <your-domain.tld>" >&2
  exit 1
fi
if [[ -z "${CLOUDFLARE_API_TOKEN:-}" || -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]]; then
  echo "Set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID first." >&2
  exit 1
fi

domain="${domain#https://}"
domain="${domain#http://}"
domain="${domain%%/*}"

npx --yes wrangler@4 pages domain add "$domain" --project-name=fd17-billsnap

cat <<EOF

If this Cloudflare account already hosts DNS for ${domain}, SSL is issued automatically.

Otherwise create these records at your registrar:

  ${domain}          CNAME   fd17-billsnap.pages.dev
  www.${domain}      CNAME   fd17-billsnap.pages.dev

Apex domains that do not support CNAME need an ALIAS/ANAME, or move DNS to Cloudflare
(free) so the CNAME can flatten.

Then set the GitHub Actions variable BILLSNAP_SITE_URL=https://${domain} so builds
emit the right canonical URLs.
EOF
