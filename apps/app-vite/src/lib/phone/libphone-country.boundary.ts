// check-as-cast-density: allow-file — react-phone-number-input Country is a branded ISO-3166 alpha-2 string
import { DEFAULT_COUNTRY_CODE, normalizeCountryCode } from "@workspace/utils";
import type { Country } from "react-phone-number-input";

function toLibPhoneCountry(code: string): Country {
  return code as Country;
}

export function resolveLibPhoneCountryFromCode(
  countryCode?: string | null,
): Country {
  const code = normalizeCountryCode(countryCode) ?? DEFAULT_COUNTRY_CODE;
  return toLibPhoneCountry(code);
}
