import { resolveApiUrl } from "./public-api";

export async function fetchLandingJson<T>(path: string, baseOrigin?: string): Promise<T> {
  const response = await fetch(resolveApiUrl(path, baseOrigin));
  if (!response.ok) throw new Error("We could not load this section. Please refresh and try again.");
  return (await response.json()) as T;
}

export async function resolvePaymentRedirectLocation(token: string, baseOrigin?: string): Promise<string | null> {
  const response = await fetch(
    resolveApiUrl(`/public/patient/pay/${encodeURIComponent(token)}`, baseOrigin),
    { redirect: "manual" },
  );
  const redirectLocation = response.headers.get("location");
  if (redirectLocation && response.status >= 300 && response.status < 400) return redirectLocation;
  return null;
}
