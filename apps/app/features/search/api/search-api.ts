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
  const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);

  if (!response.ok) {
    throw new Error("Search failed");
  }

  return (await response.json()) as SearchResult[];
}
