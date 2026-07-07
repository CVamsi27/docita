/**
 * Shared helpers for the cents-canonical money representation.
 *
 * During the Float → cents transition (schema-locked, additive-only), every
 * money field has a legacy `Float` column and a canonical `*Cents` integer
 * column. New code writes both and reads cents-first with a Float fallback so
 * rows created before the backfill still resolve correctly.
 */

/** Convert a Float major-unit amount (e.g. rupees) to integer cents/paise. */
export function toCents(amount: number | null | undefined): number | null {
  return typeof amount === "number" && Number.isFinite(amount)
    ? Math.round(amount * 100)
    : null;
}

/** Convert integer cents/paise back to a Float major-unit amount. */
export function fromCents(cents: number | null | undefined): number | null {
  return typeof cents === "number" && Number.isFinite(cents)
    ? cents / 100
    : null;
}

/**
 * Read a money value as cents, preferring the canonical `*Cents` column and
 * falling back to the legacy Float column for rows created before the backfill.
 * Returns null only when neither is present.
 */
export function resolveMoneyCents(
  cents: number | null | undefined,
  legacyFloat: number | null | undefined,
): number | null {
  if (typeof cents === "number" && Number.isFinite(cents)) return cents;
  return toCents(legacyFloat);
}

/**
 * Build the additive `{ float, cents }` write pair for a money field so both
 * columns stay in sync on create/update. Pass the major-unit amount.
 */
export function moneyWritePair<
  FloatKey extends string,
  CentsKey extends string,
>(
  floatKey: FloatKey,
  centsKey: CentsKey,
  amount: number | null | undefined,
): Record<FloatKey | CentsKey, number | null> {
  return {
    [floatKey]: typeof amount === "number" ? amount : null,
    [centsKey]: toCents(amount),
  } as Record<FloatKey | CentsKey, number | null>;
}
