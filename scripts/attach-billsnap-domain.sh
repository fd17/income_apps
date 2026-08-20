#!/usr/bin/env bash
# Attach apex + www to the Cloudflare Pages project and create proxied CNAMEs
# when the zone is on the same account. Wrangler has no `pages domain add`.
#
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
domain="${domain#www.}"

export BILLSNAP_ATTACH_DOMAIN="$domain"
python3 - <<'PY'
import json, os, sys, time, urllib.error, urllib.request

token = os.environ["CLOUDFLARE_API_TOKEN"]
account_id = os.environ["CLOUDFLARE_ACCOUNT_ID"]
apex = os.environ["BILLSNAP_ATTACH_DOMAIN"]
project = "fd17-billsnap"
pages_host = f"{project}.pages.dev"
hosts = [apex, f"www.{apex}"]


def cf(method: str, url: str, body=None):
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(
        url,
        data=data,
        method=method,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req) as resp:
            raw = resp.read().decode()
            return resp.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        raw = e.read().decode()
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            parsed = {"raw": raw}
        return e.code, parsed


def fail(message: str, payload=None) -> None:
    print(message, file=sys.stderr)
    if payload:
        print(json.dumps(payload, indent=2)[:2000], file=sys.stderr)
    sys.exit(1)


status, zones = cf(
    "GET", f"https://api.cloudflare.com/client/v4/zones?name={apex}"
)
if status != 200 or not zones.get("success"):
    fail(f"Could not look up zone {apex}", zones)
zone_list = zones.get("result") or []
if not zone_list:
    fail(f"No Cloudflare zone named {apex} on this account.")
zone_id = zone_list[0]["id"]
print(f"Zone {apex} ({zone_list[0].get('status')})")

for host in hosts:
    status, res = cf(
        "POST",
        f"https://api.cloudflare.com/client/v4/accounts/{account_id}/pages/projects/{project}/domains",
        {"name": host},
    )
    errors = res.get("errors") or []
    already = any(
        err.get("code") in (8000010, 8000034) or "already" in str(err.get("message", "")).lower()
        for err in errors
    )
    if status == 200 and res.get("success"):
        print(f"Pages hostname {host}: {(res.get('result') or {}).get('status', 'added')}")
    elif already:
        print(f"Pages hostname {host}: already attached")
    else:
        fail(f"Failed to attach Pages hostname {host}", res)

status, dns = cf(
    "GET",
    f"https://api.cloudflare.com/client/v4/zones/{zone_id}/dns_records?per_page=100",
)
if status != 200 or not dns.get("success"):
    fail("Could not list DNS records", dns)

existing = {(rec.get("name"), rec.get("type")): rec for rec in dns.get("result") or []}
for host in hosts:
    rec = existing.get((host, "CNAME"))
    if rec and rec.get("content") == pages_host and rec.get("proxied"):
        print(f"DNS CNAME {host} -> {pages_host} (proxied, exists)")
        continue
    if rec:
        status, res = cf(
            "PATCH",
            f"https://api.cloudflare.com/client/v4/zones/{zone_id}/dns_records/{rec['id']}",
            {"type": "CNAME", "name": host, "content": pages_host, "ttl": 1, "proxied": True},
        )
        action = "updated"
    else:
        status, res = cf(
            "POST",
            f"https://api.cloudflare.com/client/v4/zones/{zone_id}/dns_records",
            {"type": "CNAME", "name": host, "content": pages_host, "ttl": 1, "proxied": True},
        )
        action = "created"
    if status != 200 or not res.get("success"):
        fail(f"Failed to {action} CNAME for {host}", res)
    print(f"DNS CNAME {host} -> {pages_host} (proxied, {action})")

deadline = time.time() + 180
while time.time() < deadline:
    status, domains = cf(
        "GET",
        f"https://api.cloudflare.com/client/v4/accounts/{account_id}/pages/projects/{project}/domains",
    )
    rows = [
        d
        for d in (domains.get("result") or [])
        if d.get("name") in hosts
    ]
    summary = ", ".join(f"{d.get('name')}={d.get('status')}" for d in rows)
    print(f"SSL {summary}")
    if rows and all(d.get("status") == "active" for d in rows):
        break
    time.sleep(10)
else:
    print("SSL still provisioning; apex/www may take a few more minutes.", file=sys.stderr)

print(f"https://{apex}/")
print(f"https://www.{apex}/")
print(f"https://{pages_host}/")
PY
