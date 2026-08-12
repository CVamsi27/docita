/**
 * Resolve a stored path or absolute URL to a link the browser can open.
 * The Vite app is a pure SPA, so the current origin is always available.
 */
export function toAbsoluteAppUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }
  const normalizedPath = pathOrUrl.startsWith("/")
    ? pathOrUrl
    : `/${pathOrUrl}`;
  return `${window.location.origin}${normalizedPath}`;
}
