import type { User } from "@workspace/types";

/**
 * Shared prop types for the verification badge helpers, reused by the
 * manage-team-member dialog and doctor panel so the signatures stay in sync.
 */
export type VerificationBadgeVariantFn = (
  status?: User["verificationStatus"],
) => "default" | "secondary" | "destructive" | "outline";

export type VerificationBadgeLabelFn = (
  status: User["verificationStatus"] | undefined,
  t: (key: string) => string,
) => string;

export function getVerificationBadgeVariant(
  status?: User["verificationStatus"],
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "VERIFIED") return "default";
  if (status === "FAILED" || status === "REJECTED") return "destructive";
  if (status === "PENDING") return "secondary";
  return "outline";
}

export const getVerificationBadgeLabel: VerificationBadgeLabelFn = (
  status,
  t,
) => {
  if (!status) return t("unverifiedLabel");
  return status.charAt(0) + status.slice(1).toLowerCase();
};
