import { isRecord } from "@workspace/utils";

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

export interface ReferrerFormData {
  name: string;
  type: ReferrerType;
  email: string;
  phone: string;
}

export const INITIAL_REFERRER_FORM_DATA: ReferrerFormData = {
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
export function validateReferrerForm(form: ReferrerFormData): ReferrerFieldErrors {
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

/**
 * True when the error is the API's problem-details `DUPLICATE_ENTRY` 409
 * (idempotent-create / phone-reassignment conflict). The data-access client
 * copies `code` onto the error and exposes the envelope as `data`, so both
 * locations are checked.
 */
function isDuplicateEntryConflict(error: unknown): boolean {
  return (
    isRecord(error) &&
    error.status === 409 &&
    (error.code === "DUPLICATE_ENTRY" ||
      (isRecord(error.data) && error.data.code === "DUPLICATE_ENTRY"))
  );
}

/**
 * User-facing sentence for a duplicate-partner conflict, or null when the
 * error is not a `DUPLICATE_ENTRY` conflict. The server `detail` has no
 * trailing period; normalize so the composed sentence reads correctly
 * however the copy evolves.
 */
export function conflictMessageFromError(error: unknown): string | null {
  const record = isRecord(error) ? error : null;
  const data = record && isRecord(record.data) ? record.data : null;
  if (!record || !isDuplicateEntryConflict(record) || !data) return null;
  const detail = typeof data.detail === "string" ? data.detail : null;
  const base =
    detail ?? "A partner with this phone number already exists";
  const normalized = base.endsWith(".") ? base : `${base}.`;
  return `${normalized} Use the existing record instead.`;
}
