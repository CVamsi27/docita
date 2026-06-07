import { formatDate as formatWorkspaceDate } from "@workspace/utils";

export function formatInternalListDate(value?: string | null): string {
  if (!value) return "-";
  const formatted = formatWorkspaceDate(value);
  return formatted.trim().length > 0 ? formatted : "-";
}
