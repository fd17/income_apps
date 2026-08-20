#!/usr/bin/env bash
#
# Install a pinned, checksum-verified build of the Kraken CLI (`kraken`).
#
# The Kraken CLI is the documented runtime for the income apps in this repo
# (see the Kraken skills). This script downloads the official prebuilt binary
# for the current platform, verifies its SHA-256, and installs it onto PATH.
#
# It is idempotent: if the pinned version is already installed it exits early.
set -euo pipefail

KRAKEN_CLI_VERSION="${KRAKEN_CLI_VERSION:-0.4.1}"
INSTALL_DIR="${KRAKEN_CLI_INSTALL_DIR:-$HOME/.local/bin}"
BASE_URL="https://github.com/krakenfx/kraken-cli/releases/download/v${KRAKEN_CLI_VERSION}"

# SHA-256 of the release tarball for each supported target triple. Values come
# from the release's SHA256SUMS.txt and pin exactly what we install.
declare -A SHA256=(
  ["x86_64-unknown-linux-gnu"]="a9a91782d00065a12800b5d3d585ff59fb30e87b321070e181d044e1909e1482"
  ["aarch64-unknown-linux-gnu"]="4962f74fe65625397044b105f467fbbd67dc63954c6b0b7268b405e53f49c55f"
)

WORKDIR=""
cleanup() { [[ -n "$WORKDIR" && -d "$WORKDIR" ]] && rm -rf "$WORKDIR"; return 0; }
trap cleanup EXIT

log() { printf '[install-kraken-cli] %s\n' "$*" >&2; }

detect_target() {
  local arch
  arch="$(uname -m)"
  case "$arch" in
    x86_64 | amd64) echo "x86_64-unknown-linux-gnu" ;;
    aarch64 | arm64) echo "aarch64-unknown-linux-gnu" ;;
    *)
      log "unsupported architecture: $arch"
      exit 1
      ;;
  esac
}

main() {
  mkdir -p "$INSTALL_DIR"
  local bin="$INSTALL_DIR/kraken"

  if [[ -x "$bin" ]] && "$bin" --version 2>/dev/null | grep -q "kraken ${KRAKEN_CLI_VERSION}"; then
    log "kraken ${KRAKEN_CLI_VERSION} already installed at $bin"
    return 0
  fi

  local target expected
  target="$(detect_target)"
  expected="${SHA256[$target]:-}"
  if [[ -z "$expected" ]]; then
    log "no pinned checksum for target: $target"
    exit 1
  fi

  WORKDIR="$(mktemp -d)"

  local tarball="kraken-cli-${target}.tar.gz"
  log "downloading ${tarball} (v${KRAKEN_CLI_VERSION})"
  curl -fsSL --retry 3 --retry-delay 2 -o "$WORKDIR/$tarball" "$BASE_URL/$tarball"

  log "verifying checksum"
  echo "${expected}  $WORKDIR/$tarball" | sha256sum -c - >/dev/null

  log "extracting"
  tar -xzf "$WORKDIR/$tarball" -C "$WORKDIR"
  install -m 0755 "$WORKDIR/kraken-cli-${target}/kraken" "$bin"

  log "installed $("$bin" --version) at $bin"
}

main "$@"
