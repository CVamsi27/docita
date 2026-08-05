/**
 * Narrow a value whose non-nullness was established by a prior guard (a
 * Prisma include contract, an earlier condition, or a caller invariant) to
 * its non-null type. Throws if the invariant is ever violated so the defect
 * surfaces fail-fast instead of a silent `undefined` flowing downstream.
 *
 * Replaces postfix `!` assertions at call sites (P5.3) — the assertion lives
 * here, behind a runtime check, so the `check:non-null-assertion` ratchet
 * stays at zero while the call sites stay clean.
 */
export function nonNull<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) {
    throw new TypeError("nonNull: expected a non-null value");
  }
  return value;
}
