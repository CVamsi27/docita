import {
  dataSubjectRequestTypeSchema,
  type AppDataSubjectRequest,
  type CreateDataSubjectRequest,
  type DataSubjectRequestStatus,
  type DataSubjectRequestType,
} from "@workspace/types";

export const DATA_RETENTION_POLICIES = [
  {
    category: "Patient Records",
    retention: "7 years",
    description: "Medical records retained per DPDP Act 2023 guidelines",
  },
  {
    category: "Appointment History",
    retention: "5 years",
    description: "Appointment logs retained for continuity of care",
  },
  {
    category: "Audit Logs",
    retention: "3 years",
    description: "System access and data change logs",
  },
  {
    category: "Prescription Data",
    retention: "7 years",
    description: "Prescription records per clinical documentation standards",
  },
];

export function parseDataSubjectRequestType(
  value: string,
): DataSubjectRequestType {
  const parsed = dataSubjectRequestTypeSchema.safeParse(value);
  return parsed.success ? parsed.data : "EXPORT";
}

export const REQUEST_TYPE_OPTIONS: Array<{
  value: DataSubjectRequestType;
  label: string;
}> = [
  { value: "EXPORT", label: "Data export" },
  { value: "ACCESS", label: "Access request" },
  { value: "DELETION", label: "Deletion review" },
  { value: "CONSENT_WITHDRAWAL", label: "Consent withdrawal" },
  { value: "CORRECTION", label: "Correction request" },
];

export const INITIAL_REQUEST_FORM: CreateDataSubjectRequest = {
  requestType: "EXPORT",
  patientId: "",
  requestedByName: "",
  requestedByRelation: "",
  requestChannel: "in_person",
  requestDetails: "",
  dueAt: "",
};

export type UpdateRequestPayload = {
  requestId: string;
  status: DataSubjectRequestStatus;
};

export function toDisplayText(value: string): string {
  return value
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function isOpenRequest(status: DataSubjectRequestStatus): boolean {
  return status === "OPEN" || status === "IN_REVIEW";
}

export function isDsrOverdue(
  request: Pick<AppDataSubjectRequest, "status" | "dueAt">,
  now: Date,
): boolean {
  if (!isOpenRequest(request.status) || !request.dueAt) return false;
  return new Date(request.dueAt).getTime() < now.getTime();
}

export function sortDsrOverdueFirst<
  T extends Pick<AppDataSubjectRequest, "status" | "dueAt">,
>(requests: T[], now: Date): T[] {
  return [...requests].sort(
    (a, b) => Number(isDsrOverdue(b, now)) - Number(isDsrOverdue(a, now)),
  );
}
