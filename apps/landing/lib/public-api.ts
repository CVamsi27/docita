function getLandingApiBaseUrl(): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "/api/v1";
  const normalized = baseUrl.replace(/\/+$/, "");

  if (/\/api$/i.test(normalized)) {
    return `${normalized}/v1`;
  }

  return normalized;
}

interface ContactInquiryPayload {
  name: string;
  email: string;
  clinic: string;
  message: string;
}

export interface PlatformStatsResponse {
  clinics?: number;
  doctors?: number;
  patients?: number;
  prescriptions?: number;
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
  const response = await fetch(
    `${getLandingApiBaseUrl()}/contact/inquiry`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    throw new Error("Failed to send inquiry");
  }
}
