// The date the site's reference copy was last read against its sources.
// The tables on the home page carry it row by row; the About, Contact and
// Privacy pages state it once, under their introduction, so a visitor can
// tell how current the reference is (the plan commits show_last_updated).

export const PAGE_UPDATED_ISO = "2026-11-26";

/** "26 November 2026" — a date written the way the page's language writes it. */
export function pageUpdatedLabel(language: string): string {
  // The site writes dates day-first everywhere it states one ("26 November 2026").
  void language;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${PAGE_UPDATED_ISO}T00:00:00Z`));
}
