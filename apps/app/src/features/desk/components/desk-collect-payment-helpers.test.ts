import {
  isOpenDeskInvoice,
  PAYMENT_CHANNEL_OPTIONS,
  ROLES_CAN_RECORD_PAYMENT,
} from "./desk-collect-payment-helpers";

describe("PAYMENT_CHANNEL_OPTIONS", () => {
  it("has payment channel options", () => {
    expect(PAYMENT_CHANNEL_OPTIONS.length).toBeGreaterThan(0);
  });

  it("includes CASH option", () => {
    const cash = PAYMENT_CHANNEL_OPTIONS.find((o) => o.value === "CASH");
    expect(cash).toBeDefined();
    expect(cash!.label).toBe("Cash");
  });

  it("each option has value and label", () => {
    for (const option of PAYMENT_CHANNEL_OPTIONS) {
      expect(typeof option.value).toBe("string");
      expect(typeof option.label).toBe("string");
      expect(option.label.length).toBeGreaterThan(0);
    }
  });
});

describe("ROLES_CAN_RECORD_PAYMENT", () => {
  it("is a Set", () => {
    expect(ROLES_CAN_RECORD_PAYMENT).toBeInstanceOf(Set);
  });

  it("includes ADMIN", () => {
    expect(ROLES_CAN_RECORD_PAYMENT.has("ADMIN")).toBe(true);
  });

  it("includes RECEPTIONIST", () => {
    expect(ROLES_CAN_RECORD_PAYMENT.has("RECEPTIONIST")).toBe(true);
  });

  it("includes ADMIN_DOCTOR", () => {
    expect(ROLES_CAN_RECORD_PAYMENT.has("ADMIN_DOCTOR")).toBe(true);
  });

  it("does not include DOCTOR", () => {
    expect(ROLES_CAN_RECORD_PAYMENT.has("DOCTOR")).toBe(false);
  });

  it("does not include NURSE", () => {
    expect(ROLES_CAN_RECORD_PAYMENT.has("NURSE")).toBe(false);
  });
});

describe("isOpenDeskInvoice", () => {
  it("returns true for a status in the collectible set", () => {
    const inv = { status: "PENDING" };
    expect(isOpenDeskInvoice(inv)).toBe(true);
  });

  it("returns false for a status not in the collectible set", () => {
    const inv = { status: "PAID" };
    expect(isOpenDeskInvoice(inv)).toBe(false);
  });

  it("returns false for empty string status", () => {
    const inv = { status: "" };
    expect(isOpenDeskInvoice(inv)).toBe(false);
  });

  it("returns false for unknown status", () => {
    const inv = { status: "CANCELLED" };
    expect(isOpenDeskInvoice(inv)).toBe(false);
  });
});
