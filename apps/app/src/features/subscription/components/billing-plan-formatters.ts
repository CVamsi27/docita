import { DEFAULT_TIMEZONE } from "@workspace/utils";
import { formatLocaleDateShortMonthYear } from "@/lib/formatters";

export function formatPlanDate(
  value?: string | null,
  timezone: string = DEFAULT_TIMEZONE,
): string {
  if (!value) return "Not scheduled";
  const formatted = formatLocaleDateShortMonthYear(value, timezone);
  return formatted || "Not scheduled";
}

export function formatStatusLabel(status?: string): string {
  if (!status) return "Not set";
  return status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
