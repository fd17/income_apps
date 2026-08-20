/** Canonical URL stamped on free-plan invoices. Pro removes the watermark. */
export const WATERMARK_URL = 'https://sendtheinvoice.com';

export function watermarkHost(): string {
  return new URL(WATERMARK_URL).host;
}

/** Repeating overlay copy — short so it tiles cleanly. */
export function watermarkOverlayText(): string {
  return `Billsnap · ${watermarkHost()}`;
}

/** In-flow footer that still prints if overlay CSS is stripped. */
export function watermarkFooterText(): string {
  return `Created with Billsnap · ${WATERMARK_URL}`;
}

export function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

/** Tile used as a CSS background on the paper node itself (survives deleting child nodes). */
export function watermarkBackgroundDataUri(): string {
  const text = escapeXml(watermarkOverlayText());
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="380" height="240" viewBox="0 0 380 240"><text x="190" y="128" text-anchor="middle" fill="rgba(15,23,42,0.12)" font-family="system-ui,sans-serif" font-size="18" font-weight="700" letter-spacing="1.2" transform="rotate(-32 190 128)">${text}</text></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

export const WATERMARK_TILE_COUNT = 36;
