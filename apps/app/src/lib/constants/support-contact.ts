import { SUPPORT_EMAIL as SHARED_SUPPORT_EMAIL } from "@workspace/types";

export const SUPPORT_EMAIL = SHARED_SUPPORT_EMAIL;

export const SUPPORT_WHATSAPP_MESSAGE_DEFAULT =
  "Hi Docita team, I need help with Docita";

export const SUPPORT_WHATSAPP_MESSAGE_ONBOARDING =
  "Hi Docita team, I need help with facility onboarding and pricing for my hospital";

export const SUPPORT_WHATSAPP_MESSAGE_PUBLIC_BOOKING =
  "Hi Docita team, I need help completing my visit request from an online booking link";

const FALLBACK_SUPPORT_PHONE = "918790311010";

export function getSupportPhoneNumber(): string {
  const configuredPhone =
    import.meta.env.VITE_WHATSAPP_SUPPORT_NUMBER?.trim();
  return configuredPhone || FALLBACK_SUPPORT_PHONE;
}

export function getPhoneDigits(phoneNumber: string): string {
  return phoneNumber.replace(/\D/g, "");
}

function formatSupportPhone(phoneNumber: string): string {
  const digits = getPhoneDigits(phoneNumber);

  if (digits.length === 12 && digits.startsWith("91")) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }

  if (digits.length === 10) {
    return `${digits.slice(0, 5)} ${digits.slice(5)}`;
  }

  return phoneNumber;
}

export function getSupportPhoneDisplay(): string {
  return formatSupportPhone(getSupportPhoneNumber());
}