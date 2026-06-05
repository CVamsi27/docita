/**
 * Origin for links shared with patients (booking, portal), without trailing slash.
 */
export function getPublicAppOrigin(): string {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  const raw = process.env.NEXT_PUBLIC_APP_URL ?? "";
  return raw.replace(/\/$/, "");
}

export function getPublicBookingUrl(referralCode: string): string {
  return `${getPublicAppOrigin()}/book/${encodeURIComponent(referralCode)}`;
}
