import {
  validateSignatureImageFile,
  dataUrlToFile,
  MAX_SIGNATURE_UPLOAD_BYTES,
} from "./signature-upload";

function createMockFile(type: string, size: number, name = "test.png"): File {
  const buffer = new ArrayBuffer(size);
  return new File([buffer], name, { type });
}

describe("MAX_SIGNATURE_UPLOAD_BYTES", () => {
  it("is 5 MB", () => {
    expect(MAX_SIGNATURE_UPLOAD_BYTES).toBe(5 * 1024 * 1024);
  });
});

describe("validateSignatureImageFile", () => {
  it("returns null for a valid image file", () => {
    const file = createMockFile("image/png", 1000);
    expect(validateSignatureImageFile(file)).toBeNull();
  });

  it("accepts image/jpeg", () => {
    const file = createMockFile("image/jpeg", 1000);
    expect(validateSignatureImageFile(file)).toBeNull();
  });

  it("accepts image/webp", () => {
    const file = createMockFile("image/webp", 1000);
    expect(validateSignatureImageFile(file)).toBeNull();
  });

  it("rejects non-image files", () => {
    const file = createMockFile("application/pdf", 1000);
    expect(validateSignatureImageFile(file)).toBe("Please choose an image file");
  });

  it("rejects text files", () => {
    const file = createMockFile("text/plain", 1000);
    expect(validateSignatureImageFile(file)).toBe("Please choose an image file");
  });

  it("rejects files larger than 5 MB", () => {
    const file = createMockFile("image/png", MAX_SIGNATURE_UPLOAD_BYTES + 1);
    expect(validateSignatureImageFile(file)).toBe("Use a file smaller than 5 MB");
  });

  it("accepts files exactly at 5 MB", () => {
    const file = createMockFile("image/png", MAX_SIGNATURE_UPLOAD_BYTES);
    expect(validateSignatureImageFile(file)).toBeNull();
  });

  it("accepts very small image files", () => {
    const file = createMockFile("image/png", 1);
    expect(validateSignatureImageFile(file)).toBeNull();
  });
});

describe("dataUrlToFile", () => {
  it("converts a PNG data URL to a File", () => {
    const base64 = btoa("fake-png-data");
    const dataUrl = `data:image/png;base64,${base64}`;
    const file = dataUrlToFile(dataUrl, "signature.png");

    expect(file).toBeInstanceOf(File);
    expect(file.name).toBe("signature.png");
    expect(file.type).toBe("image/png");
    expect(file.size).toBeGreaterThan(0);
  });

  it("converts a JPEG data URL to a File", () => {
    const base64 = btoa("fake-jpeg-data");
    const dataUrl = `data:image/jpeg;base64,${base64}`;
    const file = dataUrlToFile(dataUrl, "signature.jpg");

    expect(file.type).toBe("image/jpeg");
    expect(file.name).toBe("signature.jpg");
  });

  it("defaults to image/png when MIME is not specified", () => {
    const base64 = btoa("data");
    const dataUrl = `data:,${base64}`;
    const file = dataUrlToFile(dataUrl, "sig");

    expect(file.type).toBe("image/png");
  });

  it("preserves the filename", () => {
    const base64 = btoa("data");
    const dataUrl = `data:image/png;base64,${base64}`;
    const file = dataUrlToFile(dataUrl, "my-custom-name.png");

    expect(file.name).toBe("my-custom-name.png");
  });
});
