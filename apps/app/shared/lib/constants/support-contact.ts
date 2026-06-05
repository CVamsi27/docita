export const SUPPORT_EMAIL = "support@docita.work";
export const ADMIN_EMAIL = "admin@docita.work";

/** Prefilled text when users open WhatsApp for general product help. */
export const SUPPORT_WHATSAPP_MESSAGE_DEFAULT =
  "Hi Docita team, I need help with Docita";

/** Prefilled text during facility onboarding and pricing. */
export const SUPPORT_WHATSAPP_MESSAGE_ONBOARDING =
  "Hi Docita team, I need help with facility onboarding and pricing for my hospital";

/** Prefilled text when patients use the public online booking link. */
export const SUPPORT_WHATSAPP_MESSAGE_PUBLIC_BOOKING =
  "Hi Docita team, I need help completing my visit request from an online booking link";

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
  const supportPhoneDisplay = getSupportPhoneDisplay();
  const digits = getPhoneDigits(getSupportPhoneNumber());

  if (digits.length > 0 && supportPhoneDisplay) {
    return `email ${SUPPORT_EMAIL} or WhatsApp or call ${supportPhoneDisplay}`;
  }

  return `email ${SUPPORT_EMAIL}`;
}
