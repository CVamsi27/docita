import {
  DEFAULT_FORM_OPTIONS,
  DEFAULT_VALUES,
  DEFAULT_CONFIG,
} from "./app-config";

describe("DEFAULT_FORM_OPTIONS", () => {
  it("has gender options", () => {
    expect(DEFAULT_FORM_OPTIONS.gender).toBeDefined();
    expect(DEFAULT_FORM_OPTIONS.gender.length).toBe(3);
    expect(DEFAULT_FORM_OPTIONS.gender.map((g) => g.value)).toContain("MALE");
    expect(DEFAULT_FORM_OPTIONS.gender.map((g) => g.value)).toContain("FEMALE");
    expect(DEFAULT_FORM_OPTIONS.gender.map((g) => g.value)).toContain("OTHER");
  });

  it("has blood group options", () => {
    expect(DEFAULT_FORM_OPTIONS.bloodGroup).toBeDefined();
    expect(DEFAULT_FORM_OPTIONS.bloodGroup.length).toBe(8);
    expect(DEFAULT_FORM_OPTIONS.bloodGroup.map((b) => b.value)).toContain("A+");
    expect(DEFAULT_FORM_OPTIONS.bloodGroup.map((b) => b.value)).toContain("O-");
  });

  it("has appointment type options", () => {
    expect(DEFAULT_FORM_OPTIONS.appointmentType).toBeDefined();
    expect(DEFAULT_FORM_OPTIONS.appointmentType.length).toBeGreaterThan(0);
    const values = DEFAULT_FORM_OPTIONS.appointmentType.map((a) => a.value);
    expect(values).toContain("consultation");
    expect(values).toContain("emergency");
  });

  it("has appointment status options with colors", () => {
    expect(DEFAULT_FORM_OPTIONS.appointmentStatus).toBeDefined();
    for (const status of DEFAULT_FORM_OPTIONS.appointmentStatus) {
      expect(status.color).toBeDefined();
      expect(typeof status.color).toBe("string");
    }
  });

  it("has invoice status options", () => {
    expect(DEFAULT_FORM_OPTIONS.invoiceStatus).toBeDefined();
    expect(DEFAULT_FORM_OPTIONS.invoiceStatus.length).toBeGreaterThan(0);
  });

  it("has payment status options", () => {
    expect(DEFAULT_FORM_OPTIONS.paymentStatus).toBeDefined();
    expect(DEFAULT_FORM_OPTIONS.paymentStatus.length).toBeGreaterThan(0);
  });

  it("has user role options", () => {
    expect(DEFAULT_FORM_OPTIONS.userRole).toBeDefined();
    const values = DEFAULT_FORM_OPTIONS.userRole.map((r) => r.value);
    expect(values).toContain("DOCTOR");
    expect(values).toContain("NURSE");
    expect(values).toContain("ADMIN");
  });

  it("has 7 weekday options", () => {
    expect(DEFAULT_FORM_OPTIONS.weekday).toBeDefined();
    expect(DEFAULT_FORM_OPTIONS.weekday.length).toBe(7);
    expect(DEFAULT_FORM_OPTIONS.weekday.map((w) => w.value)).toContain("monday");
    expect(DEFAULT_FORM_OPTIONS.weekday.map((w) => w.value)).toContain("sunday");
  });

  it("weekday options have short labels", () => {
    for (const day of DEFAULT_FORM_OPTIONS.weekday) {
      expect(day.short).toBeDefined();
      expect(typeof day.short).toBe("string");
      expect(day.short.length).toBeGreaterThan(0);
    }
  });

  it("has custom field type options", () => {
    expect(DEFAULT_FORM_OPTIONS.customFieldType).toBeDefined();
    expect(DEFAULT_FORM_OPTIONS.customFieldType.length).toBeGreaterThan(0);
  });

  it("has appointment duration options", () => {
    expect(DEFAULT_FORM_OPTIONS.appointmentDuration).toBeDefined();
    expect(DEFAULT_FORM_OPTIONS.appointmentDuration.length).toBeGreaterThan(0);
    const values = DEFAULT_FORM_OPTIONS.appointmentDuration.map((d) => d.value);
    expect(values).toContain(15);
    expect(values).toContain(30);
    expect(values).toContain(60);
  });

  it("has currency options with symbols", () => {
    expect(DEFAULT_FORM_OPTIONS.currency).toBeDefined();
    for (const currency of DEFAULT_FORM_OPTIONS.currency) {
      expect(currency.symbol).toBeDefined();
      expect(typeof currency.symbol).toBe("string");
    }
  });

  it("has timezone options", () => {
    expect(DEFAULT_FORM_OPTIONS.timezone).toBeDefined();
    expect(DEFAULT_FORM_OPTIONS.timezone.length).toBeGreaterThan(0);
    expect(DEFAULT_FORM_OPTIONS.timezone[0].value).toBe("Asia/Kolkata");
  });

  it("has specialty options", () => {
    expect(DEFAULT_FORM_OPTIONS.specialty).toBeDefined();
    expect(DEFAULT_FORM_OPTIONS.specialty.length).toBeGreaterThan(0);
  });

  it("has document type options", () => {
    expect(DEFAULT_FORM_OPTIONS.documentType).toBeDefined();
    expect(DEFAULT_FORM_OPTIONS.documentType.length).toBeGreaterThan(0);
  });

  it("has WhatsApp message type options", () => {
    expect(DEFAULT_FORM_OPTIONS.whatsappMessageType).toBeDefined();
    expect(DEFAULT_FORM_OPTIONS.whatsappMessageType.length).toBeGreaterThan(0);
  });
});

describe("DEFAULT_VALUES", () => {
  it("has appointment duration of 30", () => {
    expect(DEFAULT_VALUES.appointmentDuration).toBe(30);
  });

  it("has consultation fee", () => {
    expect(DEFAULT_VALUES.consultationFee).toBe(800);
  });

  it("has a valid currency", () => {
    expect(typeof DEFAULT_VALUES.currency).toBe("string");
    expect(DEFAULT_VALUES.currency.length).toBeGreaterThan(0);
  });

  it("has a valid timezone", () => {
    expect(typeof DEFAULT_VALUES.timezone).toBe("string");
    expect(DEFAULT_VALUES.timezone.length).toBeGreaterThan(0);
  });

  it("has default invoice items", () => {
    expect(DEFAULT_VALUES.invoiceItems).toBeDefined();
    expect(DEFAULT_VALUES.invoiceItems.length).toBeGreaterThan(0);
    expect(DEFAULT_VALUES.invoiceItems[0].description).toBeDefined();
    expect(DEFAULT_VALUES.invoiceItems[0].quantity).toBe(1);
    expect(DEFAULT_VALUES.invoiceItems[0].price).toBe(800);
  });
});

describe("DEFAULT_CONFIG", () => {
  it("has formOptions equal to DEFAULT_FORM_OPTIONS", () => {
    expect(DEFAULT_CONFIG.formOptions).toBe(DEFAULT_FORM_OPTIONS);
  });

  it("has defaults equal to DEFAULT_VALUES", () => {
    expect(DEFAULT_CONFIG.defaults).toBe(DEFAULT_VALUES);
  });

  it("has empty patientImportFields", () => {
    expect(DEFAULT_CONFIG.patientImportFields).toEqual([]);
  });
});
