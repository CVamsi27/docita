/** Partner types accepted by `POST /api/internal/referrers`. */
export type ReferrerType =
  | "CLINIC"
  | "PHARMACY"
  | "MARKETING_PERSON"
  | "CUSTOM";

export const REFERRER_TYPE_OPTIONS: ReadonlyArray<{
  value: ReferrerType;
  label: string;
}> = [
  { value: "CLINIC", label: "Clinic" },
  { value: "PHARMACY", label: "Pharmacy" },
  { value: "MARKETING_PERSON", label: "Marketing person" },
  { value: "CUSTOM", label: "Custom" },
];

export interface CreateReferrerFormData {
  name: string;
  type: ReferrerType;
  email: string;
  phone: string;
}

export const INITIAL_REFERRER_FORM_DATA: CreateReferrerFormData = {
  name: "",
  type: "PHARMACY",
  email: "",
  phone: "",
};

export type ReferrerFieldErrors = Partial<
  Record<"name" | "email" | "phone", string>
>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Client-side validation mirroring the server contract. Phone is optional
 * but when present must look like a dialable number (7–15 digits after
 * stripping separators).
 */
export function validateCreateReferrerForm(
  form: CreateReferrerFormData,
): ReferrerFieldErrors {
  const errors: ReferrerFieldErrors = {};
  if (!form.name.trim()) {
    errors.name = "Partner name is required";
  }
  const email = form.email.trim();
  if (email && !EMAIL_RE.test(email)) {
    errors.email = "Enter a valid email address";
  }
  const digits = form.phone.replace(/\D/g, "");
  if (form.phone.trim() && (digits.length < 7 || digits.length > 15)) {
    errors.phone = "Enter a valid phone number with country code";
  }
  return errors;
}
