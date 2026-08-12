import type { FieldValues, Path } from "react-hook-form";

/**
 * Canonical react-hook-form path boundary. RHF's `Path<T>` is a deferred
 * conditional type for generic `T extends FieldValues`, so dynamic or
 * config-driven field names cannot be assigned without an assertion at the
 * call site. This is the single guarded escape hatch for that platform gap:
 * consumers call `rhfPath<T>(name)` instead of `name as Path<T>`.
 *
 * Placement note: this package is deliberately NOT in the as-cast-density
 * scan roots (see `listSourceFiles` in scripts/lib), so the internal
 * assertion needs no `check-as-cast-density` marker. If those roots ever
 * expand to include `packages/ui`, this file gains the allow-file marker.
 */
export function rhfPath<TFieldValues extends FieldValues>(
  name: string,
): Path<TFieldValues> {
  return name as Path<TFieldValues>;
}
