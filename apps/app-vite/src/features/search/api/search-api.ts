import { apiFetch } from "@/lib/api/api-client";

export interface SearchResult {
  id: string;
  type: "patient" | "appointment" | "prescription";
  title: string;
  subtitle?: string;
  meta?: Record<string, unknown>;
}

export async function searchGlobal(searchQuery: string): Promise<SearchResult[]> {
  return apiFetch<SearchResult[]>(`/search?q=${encodeURIComponent(searchQuery)}`);
}
