/**
 * Safely escapes HTML special characters in a string to prevent XSS.
 */
export function escapeHtml(unsafe: string): string {
  if (typeof unsafe !== "string") return "";
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Strips potentially dangerous HTML tags while preserving basic formatting.
 * For simple use cases, escapeHtml is preferred.
 */
export function stripHtmlTags(unsafe: string): string {
  if (typeof unsafe !== "string") return "";
  return unsafe.replace(/<[^>]*>?/gm, "");
}
