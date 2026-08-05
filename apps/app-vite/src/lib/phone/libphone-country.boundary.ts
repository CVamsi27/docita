import {
  DEFAULT_COUNTRY_CODE,
  normalizeCountryCode,
} from "@workspace/utils";
import { getCountries, type Country } from "react-phone-number-input";

/** The lib's own supported-country list; used as the membership check below. */
const SUPPORTED_COUNTRIES = getCountries();

function toLibPhoneCountry(code: string): Country {
  // `normalizeCountryCode` only guarantees the `^[A-Z]{2}$` shape; an
  // unsupported two-letter code (e.g. a stale clinic setting) falls back to
  // the default country, matching the codebase's existing fallback semantics.
  // Tradeoff: the number is then validated against the default country's
  // rules (so a stale setting can't crash the `defaultCountry` render path),
  // rather than the previous silent cast that flowed the code to the lib.
  return (
    SUPPORTED_COUNTRIES.find((candidate) => candidate === code) ??
    DEFAULT_COUNTRY_CODE
  );
}

export function resolveLibPhoneCountryFromCode(
  countryCode?: string | null,
): Country {
  const code = normalizeCountryCode(countryCode) ?? DEFAULT_COUNTRY_CODE;
  return toLibPhoneCountry(code);
}
