import { formatDateTime as formatWorkspaceDateTime } from "@workspace/utils";

export function formatInternalTimestamp(value?: string | null): string {
  if (!value) return "-";
  const formatted = formatWorkspaceDateTime(value);
  return formatted.trim().length > 0 ? formatted : "-";
}
