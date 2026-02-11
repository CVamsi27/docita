/**
 * Simple utility to strip HTML tags from a string.
 * This is used within Zod schemas to sanitize input.
 */
export function stripHtmlTags(unsafe: string | null | undefined): string {
  if (typeof unsafe !== "string") return "";
  return unsafe.replace(/<[^>]*>?/gm, "");
}
