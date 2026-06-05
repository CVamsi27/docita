import type { ChiefComplaintPersistRow } from "./chief-complaint-types.js";
import { isChiefComplaintPersistRow } from "./chief-complaint-row.js";

export function parseChiefComplaintRows(
  value: unknown,
): ChiefComplaintPersistRow[] {
  return Array.isArray(value) ? value.filter(isChiefComplaintPersistRow) : [];
}

export function parseChiefComplaintJson(
  raw: string,
): ChiefComplaintPersistRow[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    return parseChiefComplaintRows(parsed);
  } catch {
    return [];
  }
}
