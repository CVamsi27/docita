import type { Locale } from "date-fns";
import { enUS } from "date-fns/locale";

/**
 * Intl `en-IN` abbreviations. The visible differences from en-US are
 * September ("Sept" vs "Sep") and the am/pm day periods (lowercase
 * "am"/"pm" vs "AM"/"PM"). date-fns's own `enIN` locale reuses en-US's
 * `localize` wholesale, so it cannot reproduce the internal ops portal's
 * historical `toLocaleString("en-IN", …)` output — this locale overrides
 * just those two localizers to do so.
 */
const MONTH_ABBREVIATED = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sept",
  "Oct",
  "Nov",
  "Dec",
] as const;

const monthLocalize: Locale["localize"]["month"] = (value, options) => {
  if (options?.width === "abbreviated") {
    return MONTH_ABBREVIATED[value] ?? "";
  }
  // narrow / wide / short fall back to en-US (identical names, including
  // buildLocalizeFn's fallback-to-wide behavior for unset widths).
  return enUS.localize.month(value, options);
};

// Intl `en-IN` abbreviated day periods: lowercase am/pm; every other value
// is spelled identically to en-US.
const DAY_PERIOD_ABBREVIATED: Record<string, string> = {
  am: "am",
  pm: "pm",
  midnight: "midnight",
  noon: "noon",
  morning: "morning",
  afternoon: "afternoon",
  evening: "evening",
  night: "night",
};

const dayPeriodLocalize: Locale["localize"]["dayPeriod"] = (value, options) => {
  if (options?.width === "abbreviated") {
    return DAY_PERIOD_ABBREVIATED[value] ?? "";
  }
  return enUS.localize.dayPeriod(value, options);
};

/**
 * English (India) date-fns locale with Intl en-IN abbreviations ("30 Sept
 * 2026, 04:00 pm"), matching the internal ops portal's historical
 * `toLocaleString("en-IN", …)` rendering.
 */
export const enIN: Locale = {
  ...enUS,
  code: "en-IN",
  localize: {
    ...enUS.localize,
    month: monthLocalize,
    dayPeriod: dayPeriodLocalize,
  },
};
