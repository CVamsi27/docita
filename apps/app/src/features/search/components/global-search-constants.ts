import { Calendar, FileText, User, type LucideIcon } from "lucide-react";

import type { SearchResultType } from "@workspace/types";

export const GLOBAL_SEARCH_INPUT_ID = "global-search-combobox-input";

/**
 * These three maps are indexed by `result.type` and have no fallback branch, so
 * they are `Record<SearchResultType, ...>` rather than inferred object literals:
 * adding an entity type to the wire contract now fails the typecheck here
 * instead of throwing `searchResultRoutes[...] is not a function` on click.
 */
export const typeIcons = {
  patient: User,
  appointment: Calendar,
  prescription: FileText,
} as const satisfies Record<SearchResultType, LucideIcon>;

export const typeColors = {
  patient: "badge-info",
  appointment: "badge-success",
  prescription: "tier-intelligence",
} as const satisfies Record<SearchResultType, string>;

export const searchResultRoutes = {
  patient: (id: string) => `/patients/${id}`,
  appointment: (id: string) => `/appointments?id=${id}`,
  prescription: (id: string) => `/prescriptions/${id}`,
} as const satisfies Record<SearchResultType, (id: string) => string>;