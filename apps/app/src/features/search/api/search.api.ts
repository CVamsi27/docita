import { searchResponseSchema } from "@workspace/types";

import { api } from "@/lib/api/api-client";

/**
 * `SearchResult` used to be hand-written here and cast over
 * `apiFetch<SearchResult[]>`, which checked nothing at runtime and had already
 * dropped the `relevanceScore` the strategies emit. The shape now comes from
 * the shared contract, and the response is parsed with it so an unknown result
 * type fails loudly here instead of reaching `searchResultRoutes`, which is
 * total over the three entity types with no fallback branch.
 */
export type { SearchResult } from "@workspace/types";

export async function searchGlobal(searchQuery: string) {
  return api.validate(
    `/search?q=${encodeURIComponent(searchQuery)}`,
    searchResponseSchema,
  );
}