import { TAG_COLOR_PALETTE } from "./tag-colors";

export const COLOR_PALETTE = TAG_COLOR_PALETTE.map((entry) => ({
  name: entry.name,
  value: entry.cssVar,
}));

export interface PresetTagLike {
  tag: string;
  color: string;
  category?: string;
}

export function groupPresetTags(
  presetTags: PresetTagLike[],
): Record<string, PresetTagLike[]> {
  const groups: Record<string, PresetTagLike[]> = {};

  for (const tag of presetTags) {
    const category = tag.category || "General";
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(tag);
  }

  return groups;
}
