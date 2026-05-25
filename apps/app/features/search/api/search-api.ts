import { browserJson } from "@/lib/auth/browser-request";

export interface SearchResult {
  id: string;
  type: "patient" | "appointment" | "prescription";
  title: string;
  subtitle?: string;
  meta?: Record<string, unknown>;
}

export async function searchGlobal(
  searchQuery: string,
): Promise<SearchResult[]> {
  try {
    return await browserJson<SearchResult[]>(
      `/api/search?q=${encodeURIComponent(searchQuery)}`,
    );
  } catch {
    throw new Error(
      "We could not load these search results. Please try again.",
    );
  }
}
