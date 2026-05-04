/**
 * Chief complaint is stored on `Appointment.chiefComplaint` (plain string column).
 * Structured rows (including per-line clinical notes) are persisted as JSON
 * when the payload looks like a JSON array; legacy plain-text values remain supported.
 */

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
    return structured as ChiefComplaintPersistRow[];
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
    const parsed = JSON.parse(trimmed) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [];
    }
    return parsed as ChiefComplaintPersistRow[];
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
      const rows = JSON.parse(s) as ChiefComplaintPersistRow[];
      if (!Array.isArray(rows)) {
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
