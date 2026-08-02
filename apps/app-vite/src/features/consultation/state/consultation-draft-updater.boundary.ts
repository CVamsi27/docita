// check-as-cast-density: allow-file — React setState-style updater union cannot be narrowed without assertion
export function applyDraftUpdater<T>(
  updater: ((prev: T) => T) | T,
  prev: T,
): T {
  return typeof updater === "function"
    ? (updater as (prev: T) => T)(prev)
    : updater;
}
