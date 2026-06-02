import type { ClaimStatus, ClaimType } from "@workspace/types";

export const CLAIM_STATUS_LABELS: Record<ClaimStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  INFO_REQUESTED: "Info requested",
  APPROVED: "Approved",
  PARTIALLY_APPROVED: "Partially approved",
  DENIED: "Denied",
  SETTLED: "Settled",
  CANCELLED: "Cancelled",
  APPEALED: "Appealed",
};

export const CLAIM_TYPE_LABELS: Record<ClaimType, string> = {
  PRE_AUTH: "Pre-authorization",
  REIMBURSEMENT: "Reimbursement",
};

type BadgeTone = "default" | "secondary" | "outline" | "destructive";

export const CLAIM_STATUS_TONE: Record<ClaimStatus, BadgeTone> = {
  DRAFT: "outline",
  SUBMITTED: "secondary",
  INFO_REQUESTED: "secondary",
  APPROVED: "default",
  PARTIALLY_APPROVED: "default",
  DENIED: "destructive",
  SETTLED: "default",
  CANCELLED: "outline",
  APPEALED: "secondary",
};

/** Allowed next states per status, mirroring the API ClaimStatusVO machine. */
export const CLAIM_STATUS_TRANSITIONS: Record<ClaimStatus, ClaimStatus[]> = {
  DRAFT: ["SUBMITTED", "CANCELLED"],
  SUBMITTED: [
    "INFO_REQUESTED",
    "APPROVED",
    "PARTIALLY_APPROVED",
    "DENIED",
    "CANCELLED",
  ],
  INFO_REQUESTED: [
    "SUBMITTED",
    "APPROVED",
    "PARTIALLY_APPROVED",
    "DENIED",
    "CANCELLED",
  ],
  APPROVED: ["SETTLED", "APPEALED", "CANCELLED"],
  PARTIALLY_APPROVED: ["SETTLED", "APPEALED", "CANCELLED"],
  DENIED: ["APPEALED", "CANCELLED"],
  APPEALED: [
    "SUBMITTED",
    "APPROVED",
    "PARTIALLY_APPROVED",
    "DENIED",
    "CANCELLED",
  ],
  SETTLED: [],
  CANCELLED: [],
};

/** Major-unit value from persisted minor units (paise/cents). */
export const centsToMajor = (cents: number | null | undefined): number =>
  (cents ?? 0) / 100;
