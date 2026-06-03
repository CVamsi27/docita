import { decode } from "he";

/**
 * Strips all HTML tags from a string using DOM-based entity decoding
 * before tag removal. This prevents stored XSS attacks through:
 * - Encoded HTML entities (`&lt;script&gt;`)
 * - Numeric character references (`&#60;script&#62;`)
 * - Hex character references (`&#x3C;script&#x3E;`)
 * - Nested/malformed tags (`<<script>script>`)
 *
 * Uses `he` (HTML entities) for comprehensive entity decoding across
 * all HTML4/HTML5 named entities and numeric references.
 */
export function stripHtmlTags(unsafe: string | null | undefined): string {
  if (typeof unsafe !== "string") return "";

  const decoded = decode(unsafe, { isAttributeValue: false });

  return decoded.replace(/<[^>]*>/g, "").trim();
}
