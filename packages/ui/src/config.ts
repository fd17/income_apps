export interface SiteMeta {
  /** Public-facing name of the site. */
  name: string;
  /** Short tagline shown under the site name. */
  tagline: string;
  /** Absolute URL the site is deployed to (used for canonical + OG tags). */
  url: string;
}

/**
 * Builds a page `<title>` from the site name and an optional page label,
 * keeping titles consistent across every site in the monorepo.
 */
export function pageTitle(site: SiteMeta, page?: string): string {
  return page ? `${page} · ${site.name}` : `${site.name} — ${site.tagline}`;
}
