import type { User } from "@workspace/types";

export function getVerificationBadgeVariant(
  status?: User["verificationStatus"],
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "VERIFIED") return "default";
  if (status === "FAILED" || status === "REJECTED") return "destructive";
  if (status === "PENDING") return "secondary";
  return "outline";
}

export function getVerificationBadgeLabel(
  status?: User["verificationStatus"],
  t?: (key: string) => string,
): string {
  if (!status) return t ? t("unverifiedLabel") : "Unverified";
  return status.charAt(0) + status.slice(1).toLowerCase();
}
