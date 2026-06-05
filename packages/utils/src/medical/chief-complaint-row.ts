import { isRecord } from "../is-record.js";
import type { ChiefComplaintPersistRow } from "./chief-complaint-types.js";

export function rowHasContent(row: ChiefComplaintPersistRow): boolean {
  const complaint =
    typeof row.complaint === "string" ? row.complaint.trim() : "";
  const notes = typeof row.notes === "string" ? row.notes.trim() : "";
  return complaint.length > 0 || notes.length > 0;
}

export function isChiefComplaintPersistRow(
  value: unknown,
): value is ChiefComplaintPersistRow {
  if (!isRecord(value)) return false;
  return CHIEF_COMPLAINT_STRING_FIELDS.every(
    (field) => value[field] === undefined || typeof value[field] === "string",
  );
}

const CHIEF_COMPLAINT_STRING_FIELDS = [
  "id",
  "complaint",
  "durationValue",
  "durationUnit",
  "severity",
  "notes",
] as const;
