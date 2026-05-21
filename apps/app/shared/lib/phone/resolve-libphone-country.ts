import type { Country } from "react-phone-number-input";
import { resolveLibPhoneCountryFromCode } from "@/lib/phone/libphone-country.boundary";

/** libphonenumber-js Country is a branded ISO-3166 alpha-2 code; normalizeCountryCode already validates. */
export function resolveLibPhoneCountry(
  countryCode?: string | null,
): Country {
  return resolveLibPhoneCountryFromCode(countryCode);
}
