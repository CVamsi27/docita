import { buildURL } from "../../lib/request-helpers";

export async function postInternalAuthLogout(
  baseURL: string,
  headers: HeadersInit = {},
): Promise<void> {
  const url = buildURL(baseURL, "auth/logout");
  await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify({}),
  });
}
