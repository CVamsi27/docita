export function isNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;

  if (error.name === "AbortError") return false;

  const message = error.message.toLowerCase();
  return (
    error.name === "TypeError" &&
    (message.includes("failed to fetch") ||
      message.includes("networkerror") ||
      message.includes("load failed") ||
      message.includes("fetch"))
  );
}
