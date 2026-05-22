// check-as-cast-density: allow-file — timeline repository rows stay unknown[] until generic snapshot typing lands
/** Boundary helper: timeline sources return unknown[] until repository typing is fully generic. */
export function timelineRows<T>(items: unknown[]): T[] {
  return items as T[];
}
