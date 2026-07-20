// check-as-cast-density: allow-file — File.type is a browser-controlled string; we cast to the readonly MIME tuple so the includes() check narrows correctly. The list itself is the canonical allow-list for the upload policy.
/**
 * Pure validation for the doctor registration certificate upload. Lives outside
 * the React component so it's directly testable without jsdom and so the
 * allowed-MIME / max-size policy is shared with any future bulk-uploader.
 */
export const ALLOWED_REGISTRATION_CERTIFICATE_MIMES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
] as const;

export const MAX_REGISTRATION_CERTIFICATE_BYTES = 5 * 1024 * 1024;

export type CertificateValidationError =
  | { code: "mime_not_allowed"; message: string }
  | { code: "file_too_large"; message: string };

export function validateRegistrationCertificate(
  file: Pick<File, "type" | "size">,
): CertificateValidationError | null {
  if (!ALLOWED_REGISTRATION_CERTIFICATE_MIMES.includes(
    file.type as (typeof ALLOWED_REGISTRATION_CERTIFICATE_MIMES)[number],
  )) {
    return {
      code: "mime_not_allowed",
      message: "Choose a PDF, JPEG, or PNG certificate",
    };
  }
  if (file.size > MAX_REGISTRATION_CERTIFICATE_BYTES) {
    return {
      code: "file_too_large",
      message: "Choose a certificate smaller than 5 MB",
    };
  }
  return null;
}
