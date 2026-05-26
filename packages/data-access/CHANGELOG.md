# @workspace/data-access

Manual changelog. Add an entry at the **top** when a hook, query key,
provider, or fetcher signature changes in a way consumers can observe.

## Unreleased

- internal: introduced per-package CHANGELOG hygiene. See SYSTEM_DESIGN_AND_PATTERNS.md §56 item 52.
- convention: typed `queryKey` factory at `src/lib/query-keys.ts` is the
  single source of truth for cache keys. New hooks MUST use it.
  `scripts/checks/check-query-key-factory.mjs` enforces this in
  `src/hooks/` and `src/internal/hooks/`. See SYSTEM_DESIGN_AND_PATTERNS.md
  §28.2 item 13, §56 item 47.
- convention: domain-level invalidation maps are encouraged. Each domain
  hook file may export `<domain>Invalidations` keyed by mutation name
  (e.g., `patientsInvalidations.create`). Consumers call
  `qc.invalidateQueries(invalidations.create)` instead of inlining the
  list. See SYSTEM_DESIGN_AND_PATTERNS.md §28.3 item 26.
