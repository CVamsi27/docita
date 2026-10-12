import { z } from "zod";

/**
 * Wire contract for `GET /search` (`SearchController`).
 *
 * The SPA used to hand-write `SearchResult` in
 * `apps/app/src/features/search/api/search.api.ts` and hand the server's JSON to
 * `apiFetch<SearchResult[]>`, which is a compile-time cast and not a runtime
 * check. That copy had already drifted: it omitted `relevanceScore`, which both
 * full-text strategies emit, and its `type` union was a literal restatement of
 * what the strategies happen to be today.
 *
 * That union is the part that mattered. `searchResultRoutes`, `typeIcons` and
 * `typeColors` in the SPA are total maps over the three entity types with no
 * fallback branch, so an added strategy would have thrown
 * `searchResultRoutes[...] is not a function` the moment a clinician clicked
 * the row. Parsing the response here turns that latent crash into a loud,
 * local failure that a parity test can catch first.
 *
 * `search-contract-parity.spec.ts` in `apps/api` drives the real strategies and
 * `SearchService` through these schemas.
 */

/**
 * Request-side entity filter, mirroring the `types` query parameter.
 *
 * `all` is a *filter* value only: `SearchStrategyRegistry.resolveTypes` expands
 * it into the three searchable types, and the registry holds nothing else, so
 * `all` can never reach a result. Keeping it here and excluding it from
 * `searchResultTypeSchema` makes that asymmetry explicit instead of leaving it
 * as an accident of two hand-written unions.
 */
export const searchEntityTypeSchema = z.enum([
  "patient",
  "appointment",
  "prescription",
  "all",
]);
export type SearchEntityType = z.infer<typeof searchEntityTypeSchema>;

/** Entity types a search result can actually have. */
export const SEARCH_RESULT_TYPES = [
  "patient",
  "appointment",
  "prescription",
] as const satisfies readonly SearchEntityType[];

export const searchResultTypeSchema = z.enum(SEARCH_RESULT_TYPES);
export type SearchResultType = z.infer<typeof searchResultTypeSchema>;

/**
 * One row of `GET /search`.
 *
 * `meta` stays open on purpose: the strategies disagree on purpose here —
 * patients carry `mrn`, appointments carry `startTime` and prescriptions carry
 * `createdAt` — and the SPA renders none of it. Tightening it would be
 * invention, not accuracy.
 *
 * `relevanceScore` is absent for prescriptions (that strategy has no ranking)
 * and the service already sorts on `?? 0`, so it stays optional here too.
 */
export const searchResultSchema = z.object({
  id: z.string(),
  type: searchResultTypeSchema,
  title: z.string(),
  subtitle: z.string().optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
  relevanceScore: z.number().optional(),
});

export type SearchResult = z.infer<typeof searchResultSchema>;

export const searchResponseSchema = z.array(searchResultSchema);