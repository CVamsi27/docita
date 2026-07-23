import {
  SUPPORT_EMAIL,
  ADMIN_EMAIL,
  SUPPORT_WHATSAPP_MESSAGE_DEFAULT,
  SUPPORT_WHATSAPP_MESSAGE_ONBOARDING,
  SUPPORT_WHATSAPP_MESSAGE_PUBLIC_BOOKING,
  getSupportPhoneNumber,
  getPhoneDigits,
  formatSupportPhone,
  getSupportPhoneDisplay,
  getSupportContactText,
} from "./support-contact";

describe("constants", () => {
  it("SUPPORT_EMAIL is a valid email", () => {
    expect(SUPPORT_EMAIL).toMatch(/@/);
    expect(SUPPORT_EMAIL.length).toBeGreaterThan(0);
  });

  it("ADMIN_EMAIL is a valid email", () => {
    expect(ADMIN_EMAIL).toMatch(/@/);
    expect(ADMIN_EMAIL).toBe("admin@docita.work");
  });

  it("SUPPORT_WHATSAPP_MESSAGE_DEFAULT is non-empty", () => {
    expect(SUPPORT_WHATSAPP_MESSAGE_DEFAULT.length).toBeGreaterThan(0);
    expect(SUPPORT_WHATSAPP_MESSAGE_DEFAULT).toContain("Docita");
  });

  it("SUPPORT_WHATSAPP_MESSAGE_ONBOARDING is non-empty", () => {
    expect(SUPPORT_WHATSAPP_MESSAGE_ONBOARDING.length).toBeGreaterThan(0);
    expect(SUPPORT_WHATSAPP_MESSAGE_ONBOARDING).toContain("Docita");
  });

  it("SUPPORT_WHATSAPP_MESSAGE_PUBLIC_BOOKING is non-empty", () => {
    expect(SUPPORT_WHATSAPP_MESSAGE_PUBLIC_BOOKING.length).toBeGreaterThan(0);
    expect(SUPPORT_WHATSAPP_MESSAGE_PUBLIC_BOOKING).toContain("Docita");
  });
});

describe("getPhoneDigits", () => {
  it("extracts digits from a formatted phone number", () => {
    expect(getPhoneDigits("+91 98765 43210")).toBe("919876543210");
  });

  it("returns same string for all-digit input", () => {
    expect(getPhoneDigits("9876543210")).toBe("9876543210");
  });

  it("removes spaces, dashes, parentheses", () => {
    expect(getPhoneDigits("(987) 654-3210")).toBe("9876543210");
  });

  it("returns empty string for no digits", () => {
    expect(getPhoneDigits("abc-def")).toBe("");
  });

  it("handles empty string", () => {
    expect(getPhoneDigits("")).toBe("");
  });
});

describe("formatSupportPhone", () => {
  it("formats a 12-digit Indian number with country code", () => {
    const result = formatSupportPhone("919876543210");
    expect(result).toBe("+91 98765 43210");
  });

  it("formats a 10-digit number", () => {
    const result = formatSupportPhone("9876543210");
    expect(result).toBe("98765 43210");
  });

  it("returns original for non-standard length", () => {
    const result = formatSupportPhone("123");
    expect(result).toBe("123");
  });

  it("handles number with spaces", () => {
    const result = formatSupportPhone("91 98765 43210");
    expect(result).toBe("+91 98765 43210");
  });

  it("handles number with dashes", () => {
    const result = formatSupportPhone("91-98765-43210");
    expect(result).toBe("+91 98765 43210");
  });
});

describe("getSupportPhoneNumber", () => {
  it("returns a non-empty string", () => {
    const phone = getSupportPhoneNumber();
    expect(typeof phone).toBe("string");
    expect(phone.length).toBeGreaterThan(0);
  });

  it("returns a string with only digits", () => {
    const phone = getSupportPhoneNumber();
    expect(phone).toMatch(/^\d+$/);
  });
});

describe("getSupportPhoneDisplay", () => {
  it("returns a formatted phone string", () => {
    const display = getSupportPhoneDisplay();
    expect(typeof display).toBe("string");
    expect(display.length).toBeGreaterThan(0);
  });
});

describe("getSupportContactText", () => {
  it("returns a string containing the support email", () => {
    const text = getSupportContactText();
    expect(text).toContain(SUPPORT_EMAIL);
  });

  it("returns a non-empty string", () => {
    const text = getSupportContactText();
    expect(text.length).toBeGreaterThan(0);
  });
});
