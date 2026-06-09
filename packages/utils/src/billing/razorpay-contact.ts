export type SubscriptionBillingContactInput = {
  name: string | null | undefined;
  email: string | null | undefined;
  phoneNumber: string | null | undefined;
};

export type ClinicBillingFallback = {
  name: string;
  email: string;
  phone: string;
};

export type ResolvedRazorpayBillingContact = {
  name: string;
  email: string;
  phone?: string;
};

/**
 * Razorpay `contact` expects digits (10-digit Indian mobile when applicable).
 */
export function normalizeRazorpayContactPhone(
  phone: string | null | undefined,
): string | undefined {
  if (!phone?.trim()) {
    return undefined;
  }
  const digits = phone.replace(/\D/g, "");
  if (!digits) return undefined;
  if (digits.length >= 10) return digits.slice(-10);
  return digits;
}

export function resolveSubscriptionBillingContact(params: {
  billingContact: SubscriptionBillingContactInput;
  clinic: ClinicBillingFallback;
}): ResolvedRazorpayBillingContact {
  const email =
    params.billingContact.email?.trim() ||
    params.clinic.email.trim() ||
    "";
  const name =
    params.billingContact.name?.trim() ||
    params.clinic.name.trim() ||
    "Clinic Admin";
  const phone =
    normalizeRazorpayContactPhone(params.billingContact.phoneNumber) ||
    normalizeRazorpayContactPhone(params.clinic.phone);

  return {
    name,
    email,
    ...(phone ? { phone } : {}),
  };
}
