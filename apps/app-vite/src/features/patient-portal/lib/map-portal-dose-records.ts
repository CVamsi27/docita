import { isRecord } from "@workspace/utils";

export type PortalDoseStatus =
  | "TAKEN"
  | "MISSED"
  | "SKIPPED"
  | "PENDING"
  | "ADMINISTERED";

const portalDoseStatusByInput: Record<string, PortalDoseStatus> = {
  TAKEN: "TAKEN",
  MISSED: "MISSED",
  SKIPPED: "SKIPPED",
  PENDING: "PENDING",
  ADMINISTERED: "ADMINISTERED",
};

function parsePortalDoseStatus(value: unknown): PortalDoseStatus | null {
  return typeof value === "string"
    ? (portalDoseStatusByInput[value.toUpperCase()] ?? null)
    : null;
}

export function mapPortalDoseRow(dose: Record<string, unknown>): {
  id: string;
  status: PortalDoseStatus;
  scheduledAt: string;
  medicationName?: string;
} {
  const medication = isRecord(dose.medication) ? dose.medication : undefined;
  return {
    id: typeof dose.id === "string" ? dose.id : "",
    status: parsePortalDoseStatus(dose.status) ?? "PENDING",
    scheduledAt: typeof dose.scheduledAt === "string" ? dose.scheduledAt : "",
    medicationName:
      typeof medication?.name === "string" ? medication.name : undefined,
  };
}
