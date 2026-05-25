import {
  formatDate as formatWorkspaceDate,
  formatDateTime as formatWorkspaceDateTime,
} from "@workspace/utils";

/** Lists / internal tools: show "-" when missing; prefer IST-aligned formatting from workspace. */
export function formatInternalListDate(value?: string | null): string {
  if (!value) return "-";
  const formatted = formatWorkspaceDate(value);
  return formatted.trim().length > 0 ? formatted : "-";
}

/** Audit trails / dialogs where date + time should match workspace TZ defaults. */
export function formatInternalTimestamp(value?: string | null): string {
  if (!value) return "-";
  const formatted = formatWorkspaceDateTime(value);
  return formatted.trim().length > 0 ? formatted : "-";
}
