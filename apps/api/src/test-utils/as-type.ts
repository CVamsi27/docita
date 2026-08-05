type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

// check-as-cast-density: allow-file — canonical test-fixture seam: `DeepPartial<T>`
// is the erased runtime value and `T` the asserted spec target; the assertion is
// the entire purpose of the helper. A `makePartial<T>()` in `@workspace/utils`
// would be net-zero — `packages/utils/src` is inside the as-cast scan roots, so
// the same `as T` would need its own allow-file marker there (no cast-free
// formulation exists for a subtype narrowing). `packages/types` (non-scanned) is
// also out: AGENTS.md §15.3 restricts it to Zod schemas + inferred types, unlike
// the rhfPath-in-`packages/ui` precedent which had a real dependency hook — so
// the single marker stays here.
export const asType = <T>(value: DeepPartial<T>): T => value as T;
