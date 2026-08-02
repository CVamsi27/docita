export function formatPlanDate(value?: string | null): string {
  if (!value) return "Not scheduled";
  try {
    return new Date(value).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "Not scheduled";
  }
}

export function formatStatusLabel(status?: string): string {
  if (!status) return "Not set";
  return status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}
