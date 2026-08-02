import { describe, expect, it } from "vitest";
import {
  ALLOWED_REGISTRATION_CERTIFICATE_MIMES,
  MAX_REGISTRATION_CERTIFICATE_BYTES,
  validateRegistrationCertificate,
} from "./registration-certificate-upload.helpers";

describe("validateRegistrationCertificate", () => {
  it("accepts an allowed PDF within the size limit", () => {
    expect(
      validateRegistrationCertificate({ type: "application/pdf", size: 1024 }),
    ).toBeNull();
  });

  it("accepts JPEG and PNG images", () => {
    expect(
      validateRegistrationCertificate({ type: "image/jpeg", size: 2048 }),
    ).toBeNull();
    expect(
      validateRegistrationCertificate({ type: "image/png", size: 2048 }),
    ).toBeNull();
  });

  it("rejects disallowed MIME types", () => {
    const result = validateRegistrationCertificate({
      type: "text/html",
      size: 1024,
    });
    expect(result?.code).toBe("mime_not_allowed");
  });

  it("rejects files over the 5 MB cap", () => {
    const result = validateRegistrationCertificate({
      type: "application/pdf",
      size: MAX_REGISTRATION_CERTIFICATE_BYTES + 1,
    });
    expect(result?.code).toBe("file_too_large");
  });

  it("accepts every allow-listed MIME", () => {
    for (const mime of ALLOWED_REGISTRATION_CERTIFICATE_MIMES) {
      expect(
        validateRegistrationCertificate({ type: mime, size: 100 }),
      ).toBeNull();
    }
  });
});
