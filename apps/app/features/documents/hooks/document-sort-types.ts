export type SortKey = "date" | "patient" | "type" | "filename";
export type SortDirection = "asc" | "desc";

export interface SortConfig {
  key: SortKey;
  direction: SortDirection;
}
