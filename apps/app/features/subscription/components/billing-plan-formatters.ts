import { formatLocaleDateShortMonthYear } from "@/lib/formatters";

export function formatPlanDate(value?: string | null): string {
  if (!value) return "Not scheduled";
  const formatted = formatLocaleDateShortMonthYear(value);
  return formatted.length > 0 ? formatted : "Not scheduled";
}

export function formatStatusLabel(status?: string): string {
  if (!status) return "Not set";
  return status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
