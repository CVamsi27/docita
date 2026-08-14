function getPublicAppOrigin(): string {
  if (typeof window !== "undefined") return window.location.origin;
  const raw = import.meta.env.VITE_APP_URL ?? "";
  return raw.replace(/\/$/, "");
}

export function getPublicBookingUrl(referralCode: string): string {
  return `${getPublicAppOrigin()}/book/${encodeURIComponent(referralCode)}`;
}