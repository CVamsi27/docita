
export function stripHtmlTags(unsafe: string | null | undefined): string {
  if (typeof unsafe !== "string") return "";
  return unsafe.replace(/<[^>]*>?/gm, "");
}
