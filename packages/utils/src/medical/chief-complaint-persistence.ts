/**
 * Chief complaint is stored on `Appointment.chiefComplaint` (plain string column).
 * Structured rows (including per-line clinical notes) are persisted as JSON
 * when the payload looks like a JSON array; legacy plain-text values remain supported.
 */

import { isRecord } from "../is-record.js";

export interface ChiefComplaintPersistRow {
  id?: string;
  complaint?: string;
  durationValue?: string;
  durationUnit?: string;
  severity?: string;
  notes?: string;
}

function rowHasContent(row: ChiefComplaintPersistRow): boolean {
  const c = typeof row.complaint === "string" ? row.complaint.trim() : "";
  const n = typeof row.notes === "string" ? row.notes.trim() : "";
  return c.length > 0 || n.length > 0;
}

function isChiefComplaintPersistRow(value: unknown): value is ChiefComplaintPersistRow {
  if (!isRecord(value)) {
    return false;
  }
  return (
    (value["id"] === undefined || typeof value["id"] === "string") &&
    (value["complaint"] === undefined ||
      typeof value["complaint"] === "string") &&
    (value["durationValue"] === undefined ||
      typeof value["durationValue"] === "string") &&
    (value["durationUnit"] === undefined ||
      typeof value["durationUnit"] === "string") &&
    (value["severity"] === undefined ||
      typeof value["severity"] === "string") &&
    (value["notes"] === undefined || typeof value["notes"] === "string")
  );
}

function parseChiefComplaintRows(value: unknown): ChiefComplaintPersistRow[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(isChiefComplaintPersistRow);
}

export function serializeChiefComplaintsForPatch(
  items: ChiefComplaintPersistRow[],
): string {
  const rows = items.filter(rowHasContent);
  if (rows.length === 0) return "";
  return JSON.stringify(rows);
}

/**
 * Reads structured chief complaints from appointment API / Prisma-shaped objects.
 * Returns an empty array when the field should be interpreted as legacy plain text.
 */
export function parseChiefComplaintsFromAppointmentData(
  data: Record<string, unknown>,
): ChiefComplaintPersistRow[] {
  const structured = data["chiefComplaintStructured"];
  if (Array.isArray(structured) && structured.length > 0) {
    return parseChiefComplaintRows(structured);
  }

  const raw = data["chiefComplaint"];
  if (typeof raw !== "string") {
    return [];
  }
  const trimmed = raw.trim();
  if (!trimmed.startsWith("[")) {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(trimmed);
    return parseChiefComplaintRows(parsed);
  } catch {
    return [];
  }
}

/**
 * One-line summary for headers, timelines, and search subtitles.
 */
export function formatChiefComplaintSummary(
  raw: string | null | undefined,
): string | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;

  if (s.startsWith("[")) {
    try {
      const rows = parseChiefComplaintRows(JSON.parse(s));
      if (rows.length === 0) {
        return s;
      }
      const parts = rows.map((row) => {
        const c = row.complaint?.trim() ?? "";
        const n = row.notes?.trim() ?? "";
        if (c && n) return `${c} (${n})`;
        if (c) return c;
        if (n) return n;
        return "";
      }).filter(Boolean);
      return parts.length > 0 ? parts.join("; ") : null;
    } catch {
      return s;
    }
  }

  return s;
}
