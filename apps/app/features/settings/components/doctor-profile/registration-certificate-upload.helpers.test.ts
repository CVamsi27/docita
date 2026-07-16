import { describe, expect, it } from "vitest";
import {
  ALLOWED_REGISTRATION_CERTIFICATE_MIMES,
  MAX_REGISTRATION_CERTIFICATE_BYTES,
  validateRegistrationCertificate,
} from "./registration-certificate-upload.helpers";

function makeFile(type: string, size: number): Pick<File, "type" | "size"> {
  return { type, size };
}

describe("validateRegistrationCertificate", () => {
  it("accepts every allowed MIME type", () => {
    for (const type of ALLOWED_REGISTRATION_CERTIFICATE_MIMES) {
      const result = validateRegistrationCertificate(makeFile(type, 1024));
      expect(result).toBeNull();
    }
  });

  it("rejects an unsupported MIME with a user-facing message", () => {
    const result = validateRegistrationCertificate(makeFile("text/html", 1024));
    expect(result).toEqual({
      code: "mime_not_allowed",
      message: "Choose a PDF, JPEG, or PNG certificate",
    });
  });

  it("rejects a file exactly at the size limit + 1 byte", () => {
    const result = validateRegistrationCertificate(
      makeFile("application/pdf", MAX_REGISTRATION_CERTIFICATE_BYTES + 1),
    );
    expect(result).toEqual({
      code: "file_too_large",
      message: "Choose a certificate smaller than 5 MB",
    });
  });

  it("accepts a file exactly at the size limit", () => {
    const result = validateRegistrationCertificate(
      makeFile("application/pdf", MAX_REGISTRATION_CERTIFICATE_BYTES),
    );
    expect(result).toBeNull();
  });

  it("accepts a 1-byte file", () => {
    expect(
      validateRegistrationCertificate(makeFile("image/png", 1)),
    ).toBeNull();
  });

  it("rejects an empty type with mime_not_allowed", () => {
    // Browsers sometimes report empty type for unknown extensions.
    const result = validateRegistrationCertificate(makeFile("", 1024));
    expect(result?.code).toBe("mime_not_allowed");
  });
});
