function normalizeBaseUrl(raw: string): string {
  const trimmed = raw.replace(/\/+$/, "");
  if (/\/api$/i.test(trimmed)) {
    return `${trimmed}/v1`;
  }
  return trimmed;
}

export function getLandingApiBaseUrl(): string {
  const baseUrl = import.meta.env["PUBLIC_API_URL"] || "/api/v1";
  return normalizeBaseUrl(baseUrl);
}

export function getAppBaseUrl(): string {
  return import.meta.env["PUBLIC_APP_URL"] || "http://localhost:3000";
}

export interface ContactInquiryPayload {
  name: string;
  email: string;
  clinic: string;
  message: string;
}

export async function fetchLandingJson<T>(path: string): Promise<T> {
  const response = await fetch(`${getLandingApiBaseUrl()}${path}`);

  if (!response.ok) {
    throw new Error("Request failed");
  }

  return (await response.json()) as T;
}

export async function submitContactInquiry(
  payload: ContactInquiryPayload,
): Promise<void> {
  const response = await fetch(`${getLandingApiBaseUrl()}/contact/inquiry`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Failed to send inquiry");
  }
}
