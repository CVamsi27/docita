import { DEFAULT_COUNTRY_CODE, normalizeCountryCode } from "@workspace/utils";
import type { Country } from "react-phone-number-input";

/** libphonenumber-js Country is a branded ISO-3166 alpha-2 code; normalizeCountryCode already validates. */
export function resolveLibPhoneCountry(
  countryCode?: string | null,
): Country {
  const code = normalizeCountryCode(countryCode) ?? DEFAULT_COUNTRY_CODE;
  return code as Country;
}
