import {
  getCountryCallingCode,
  isPossiblePhoneNumber,
  parsePhoneNumber,
} from "react-phone-number-input";
import { resolveLibPhoneCountryFromCode } from "@/lib/phone/libphone-country.boundary";

export function validatePhoneForCountry(
  phoneNumber: string | null | undefined,
  countryCode?: string | null,
): string | null {
  const phone = phoneNumber?.trim() ?? "";
  if (!phone) return null;

  const country = resolveLibPhoneCountryFromCode(countryCode);
  const isValid = isPossiblePhoneNumber(phone, country);
  const parsed = parsePhoneNumber(phone, country);
  const matchesCountry =
    parsed?.countryCallingCode === getCountryCallingCode(country);

  if (!isValid || !matchesCountry)
    return "Enter a valid phone number for the selected clinic country";

  return null;
}
