import { DEFAULT_COUNTRY_CODE, resolveCountryCodeOrDefault } from "@workspace/utils";
import type { Country } from "react-phone-number-input";

/** libphonenumber-js Country is a branded ISO-3166 alpha-2 code; resolveCountryCodeOrDefault already validates. */
export function resolveLibPhoneCountry(
  settings: Record<string, unknown> | undefined,
): Country {
  const code = resolveCountryCodeOrDefault(settings);
  return (/^[A-Z]{2}$/.test(code) ? code : DEFAULT_COUNTRY_CODE) as Country;
}
