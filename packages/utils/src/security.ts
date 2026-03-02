
export function escapeHtml(unsafe: string): string {
  if (typeof unsafe !== "string") return "";
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function stripHtmlTags(unsafe: string): string {
  if (typeof unsafe !== "string") return "";
  return unsafe.replace(/<[^>]*>?/gm, "");
}
