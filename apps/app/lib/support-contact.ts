export const SUPPORT_EMAIL = "support@docita.work";

const FALLBACK_SUPPORT_PHONE = "918790311010";

export function getSupportPhoneNumber(): string {
  const configuredPhone = process.env.NEXT_PUBLIC_WHATSAPP_SUPPORT_NUMBER?.trim();
  return configuredPhone || FALLBACK_SUPPORT_PHONE;
}

export function getPhoneDigits(phoneNumber: string): string {
  return phoneNumber.replace(/\D/g, "");
}

export function formatSupportPhone(phoneNumber: string): string {
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

export function getSupportContactText(): string {
  return `email ${SUPPORT_EMAIL} or call ${getSupportPhoneDisplay()}`;
}
