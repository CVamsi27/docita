import type { FacilityLeadStatus } from "@workspace/types";

export const LEAD_STATUS_LABELS: Record<FacilityLeadStatus, string> = {
  SUBMITTED: "Submitted",
  TRIAGED: "Triaged",
  CONTACT_ATTEMPTED: "Contact attempted",
  CONTACTED: "Contacted",
  DEMO_SCHEDULED: "Demo scheduled",
  ONBOARDING: "Onboarding",
  TRIAL: "Trial",
  CONVERTED: "Converted",
  DUPLICATE: "Duplicate",
  NOT_INTERESTED: "Not interested",
  INVALID: "Invalid",
  UNREACHABLE: "Unreachable",
  REJECTED: "Rejected",
  LOST: "Lost",
};

/** Terminal states render as destructive; converted as a positive default. */
const TERMINAL_DESTRUCTIVE: ReadonlySet<FacilityLeadStatus> = new Set([
  "DUPLICATE",
  "NOT_INTERESTED",
  "INVALID",
  "UNREACHABLE",
  "REJECTED",
  "LOST",
]);

export function leadStatusBadgeVariant(
  status: FacilityLeadStatus,
): "default" | "outline" | "destructive" {
  if (status === "CONVERTED") return "default";
  if (TERMINAL_DESTRUCTIVE.has(status)) return "destructive";
  return "outline";
}
