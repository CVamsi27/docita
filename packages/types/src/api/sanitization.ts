/**
 * Common HTML named entities. We only decode the ones that are either
 * XSS-relevant (tag delimiters) or commonly seen in real-world text.
 * Anything not in the table is left as the literal entity string
 * (e.g. `&Eacute;` stays as `&Eacute;`), which is the safe behavior
 * for a sanitization step — the dangerous cases all live in the table.
 *
 * Keeping this list small replaces a 29.5 KB gzip dependency
 * (`he` + `hastscript` + transitive unified chain) with ~1 KB of
 * inline data, which matters for the Cloudflare worker bundle cap.
 */
const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: "\u00a0",
  // Common typographic
  copy: "\u00a9",
  reg: "\u00ae",
  trade: "\u2122",
  hellip: "…",
  mdash: "\u2014",
  ndash: "\u2013",
  lsquo: "\u2018",
  rsquo: "\u2019",
  ldquo: "\u201c",
  rdquo: "\u201d",
  bull: "\u2022",
  middot: "\u00b7",
  // Common math / units (frequent in medical data)
  deg: "\u00b0",
  plusmn: "\u00b1",
  times: "\u00d7",
  divide: "\u00f7",
  frac12: "\u00bd",
  frac14: "\u00bc",
  frac34: "\u00be",
  micro: "\u00b5",
  // Common accented letters seen in patient names / addresses
  iexcl: "\u00a1",
  cent: "\u00a2",
  pound: "\u00a3",
  yen: "\u00a5",
  euro: "\u20ac",
  section: "\u00a7",
  para: "\u00b6",
  // Latin-1 supplement
  Agrave: "\u00c0",
  Aacute: "\u00c1",
  Acirc: "\u00c2",
  Atilde: "\u00c3",
  Auml: "\u00c4",
  Aring: "\u00c5",
  AElig: "\u00c6",
  Ccedil: "\u00c7",
  Egrave: "\u00c8",
  Eacute: "\u00c9",
  Ecirc: "\u00ca",
  Euml: "\u00cb",
  Igrave: "\u00cc",
  Iacute: "\u00cd",
  Icirc: "\u00ce",
  Iuml: "\u00cf",
  Ntilde: "\u00d1",
  Ograve: "\u00d2",
  Oacute: "\u00d3",
  Ocirc: "\u00d4",
  Otilde: "\u00d5",
  Ouml: "\u00d6",
  Oslash: "\u00d8",
  Ugrave: "\u00d9",
  Uacute: "\u00da",
  Ucirc: "\u00db",
  Uuml: "\u00dc",
  Yacute: "\u00dd",
  THORN: "\u00de",
  szlig: "\u00df",
  agrave: "\u00e0",
  aacute: "\u00e1",
  acirc: "\u00e2",
  atilde: "\u00e3",
  auml: "\u00e4",
  aring: "\u00e5",
  aelig: "\u00e6",
  ccedil: "\u00e7",
  egrave: "\u00e8",
  eacute: "\u00e9",
  ecirc: "\u00ea",
  euml: "\u00eb",
  igrave: "\u00ec",
  iacute: "\u00ed",
  icirc: "\u00ee",
  iuml: "\u00ef",
  ntilde: "\u00f1",
  ograve: "\u00f2",
  oacute: "\u00f3",
  ocirc: "\u00f4",
  otilde: "\u00f5",
  ouml: "\u00f6",
  oslash: "\u00f8",
  ugrave: "\u00f9",
  uacute: "\u00fa",
  ucirc: "\u00fb",
  uuml: "\u00fc",
  yacute: "\u00fd",
  thorn: "\u00fe",
  yuml: "\u00ff",
};

/**
 * Decodes the small set of HTML entities we recognize, plus numeric
 * (`&#NNN;`) and hex (`&#xHH;`) character references. Behavior matches
 * the relevant subset of the `he` library we previously depended on.
 */
function decodeHtmlEntities(input: string): string {
  // Fast path: no ampersand means nothing to decode.
  if (input.indexOf("&") === -1) return input;

  return input.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z][a-zA-Z0-9]*);/g, (match, body: string) => {
    if (body[0] === "#") {
      // Numeric character reference.
      const isHex = body[1] === "x" || body[1] === "X";
      const codePoint = isHex
        ? parseInt(body.slice(2), 16)
        : parseInt(body.slice(1), 10);
      if (!Number.isFinite(codePoint) || codePoint < 0 || codePoint > 0x10ffff) {
        return match;
      }
      try {
        return String.fromCodePoint(codePoint);
      } catch {
        return match;
      }
    }
    // Named entity — case-sensitive lookup against the small table.
    return NAMED_ENTITIES[body] ?? match;
  });
}

/**
 * Strips all HTML tags from a string using DOM-based entity decoding
 * before tag removal. This prevents stored XSS attacks through:
 * - Encoded HTML entities (`&lt;script&gt;`)
 * - Numeric character references (`&#60;script&#62;`)
 * - Hex character references (`&#x3C;script&#x3E;`)
 * - Nested/malformed tags (`<<script>script>`)
 *
 * Replaces the previous `he`-based implementation with a hand-rolled
 * decoder. The named-entity table is intentionally small — only
 * XSS-relevant and commonly-observed entities are decoded. Anything
 * not in the table is left as the literal entity string, which is the
 * safe behavior for a sanitization step.
 */
export function stripHtmlTags(unsafe: string | null | undefined): string {
  if (typeof unsafe !== "string") return "";

  const decoded = decodeHtmlEntities(unsafe);

  return decoded.replace(/<[^>]*>/g, "").trim();
}
