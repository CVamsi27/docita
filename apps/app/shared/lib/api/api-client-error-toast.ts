import type { ApiClientError } from "./api-client-error-types";

export function shouldSuppressDevToast(message: string): boolean {
  if (process.env.NODE_ENV !== "development") return false;
  const lowered = message.toLowerCase();
  return (
    devSuppressedFragments.some((fragment) => lowered.includes(fragment)) ||
    message.includes("\n")
  );
}

export function apiErrorToastFallback(error: ApiClientError): string {
  if (error.status === 429) {
    return "Too many attempts. Please wait a moment before trying again.";
  }
  return isClientError(error)
    ? "Please check the information and try again"
    : "Please review the information on this screen and try again";
}

export function apiErrorToastCategory(
  error: ApiClientError,
): "form" | "generic" {
  return isClientError(error) ? "form" : "generic";
}

const devSuppressedFragments = [
  "fast refresh",
  "next dev",
  "pnpm",
  "cache bypass, force executing",
  "prisma:error",
  "invalid `this.prisma",
];

function isClientError(error: ApiClientError): boolean {
  return Boolean(error.status && error.status >= 400 && error.status < 500);
}
