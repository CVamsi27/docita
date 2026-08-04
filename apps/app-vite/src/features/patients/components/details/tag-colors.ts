type TagColorToken =
  | "rose"
  | "amber"
  | "emerald"
  | "teal"
  | "sky"
  | "indigo"
  | "violet"
  | "pink"
  | "slate";

interface TagColor {
  token: TagColorToken;
  name: string;
  cssVar: string;
}

export const TAG_COLOR_PALETTE: ReadonlyArray<TagColor> = [
  { token: "rose", name: "Rose", cssVar: "var(--tag-rose)" },
  { token: "amber", name: "Amber", cssVar: "var(--tag-amber)" },
  { token: "emerald", name: "Emerald", cssVar: "var(--tag-emerald)" },
  { token: "teal", name: "Teal", cssVar: "var(--tag-teal)" },
  { token: "sky", name: "Sky", cssVar: "var(--tag-sky)" },
  { token: "indigo", name: "Indigo", cssVar: "var(--tag-indigo)" },
  { token: "violet", name: "Violet", cssVar: "var(--tag-violet)" },
  { token: "pink", name: "Pink", cssVar: "var(--tag-pink)" },
  { token: "slate", name: "Slate", cssVar: "var(--tag-slate)" },
];

export const DEFAULT_TAG_COLOR_VAR = "var(--tag-sky)";

const KNOWN_TOKEN_VARS = new Set(TAG_COLOR_PALETTE.map((c) => c.cssVar));

/**
 * Resolves any persisted color value (legacy hex, design token name,
 * or `var(...)` reference) into a stable CSS color string.
 *
 * Falls back to the design system default when no match is found rather
 * than rendering an arbitrary hex fragment unsupported by the palette.
 */
export function resolveTagColor(value: string | null | undefined): string {
  if (!value) return DEFAULT_TAG_COLOR_VAR;
  const trimmed = value.trim();
  if (!trimmed) return DEFAULT_TAG_COLOR_VAR;

  if (trimmed.startsWith("var(")) {
    return KNOWN_TOKEN_VARS.has(trimmed) ? trimmed : DEFAULT_TAG_COLOR_VAR;
  }

  const byToken = TAG_COLOR_PALETTE.find(
    (entry) => entry.token === trimmed.toLowerCase(),
  );
  if (byToken) return byToken.cssVar;

  return DEFAULT_TAG_COLOR_VAR;
}

export function getTagColorName(value: string | null | undefined): string {
  if (!value) return "Sky";
  const resolved = resolveTagColor(value);
  return (
    TAG_COLOR_PALETTE.find((entry) => entry.cssVar === resolved)?.name ?? "Sky"
  );
}
