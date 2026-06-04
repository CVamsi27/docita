import type { ChiefComplaintPersistRow } from "./chief-complaint-types.js";
import { parseChiefComplaintRows } from "./chief-complaint-parse.js";

export function formatChiefComplaintSummary(
  raw: string | null | undefined,
): string | null {
  if (raw == null) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  return trimmed.startsWith("[") ? formatStructuredSummary(trimmed) : trimmed;
}

function formatStructuredSummary(raw: string): string | null {
  try {
    const rows = parseChiefComplaintRows(JSON.parse(raw));
    if (rows.length === 0) return raw;
    const summary = rows
      .map(formatChiefComplaintRow)
      .filter(Boolean)
      .join("; ");
    return summary || null;
  } catch {
    return raw;
  }
}

function formatChiefComplaintRow(row: ChiefComplaintPersistRow): string {
  const complaint = row.complaint?.trim() ?? "";
  const notes = row.notes?.trim() ?? "";
  if (complaint && notes) return `${complaint} (${notes})`;
  return complaint || notes;
}
