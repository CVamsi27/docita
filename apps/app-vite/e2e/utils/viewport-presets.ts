/** Shared viewport presets for responsive E2E sweeps (390 / 768 / 1280). */
export const VIEWPORT_PRESETS = {
  mobile: { width: 390, height: 844 },
  tablet: { width: 768, height: 1024 },
  laptop: { width: 1280, height: 720 },
} as const;

export type ViewportPresetName = keyof typeof VIEWPORT_PRESETS;

export const RESPONSIVE_PROJECTS = [
  "mobile-chrome",
  "tablet-chrome",
  "laptop-chrome",
] as const;

/** @deprecated Use VIEWPORT_PRESETS.mobile */
export const MOBILE_VIEWPORT = VIEWPORT_PRESETS.mobile;
