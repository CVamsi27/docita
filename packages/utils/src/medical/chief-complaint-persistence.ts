import type { ChiefComplaintPersistRow } from "./chief-complaint-types.js";
import {
  parseChiefComplaintJson,
  parseChiefComplaintRows,
} from "./chief-complaint-parse.js";
import { rowHasContent } from "./chief-complaint-row.js";
import { formatChiefComplaintSummary } from "./chief-complaint-summary.js";

export type { ChiefComplaintPersistRow } from "./chief-complaint-types.js";

export function serializeChiefComplaintsForPatch(
  items: ChiefComplaintPersistRow[],
): string {
  const rows = items.filter(rowHasContent);
  if (rows.length === 0) return "";
  return JSON.stringify(rows);
}

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
  return trimmed.startsWith("[") ? parseChiefComplaintJson(trimmed) : [];
}
export { formatChiefComplaintSummary };
