import { describe, expect, it } from "vitest";
import {
  normalizeRazorpayContactPhone,
  resolveSubscriptionBillingContact,
} from "./razorpay-contact.js";

describe("razorpay-contact", () => {
  it("prefers admin phone over clinic phone", () => {
    const resolved = resolveSubscriptionBillingContact({
      billingContact: {
        name: "Vamsi Chandaluri",
        email: "admin@clinic.test",
        phoneNumber: "+91 98765 43210",
      },
      clinic: {
        name: "Test Clinic",
        email: "clinic@clinic.test",
        phone: "1111111111",
      },
    });
    expect(resolved.phone).toBe("9876543210");
    expect(resolved.email).toBe("admin@clinic.test");
  });

  it("falls back to clinic phone when admin phone is missing", () => {
    const resolved = resolveSubscriptionBillingContact({
      billingContact: {
        name: "Admin",
        email: null,
        phoneNumber: null,
      },
      clinic: {
        name: "Clinic",
        email: "clinic@clinic.test",
        phone: "+919876543210",
      },
    });
    expect(resolved.phone).toBe("9876543210");
    expect(resolved.email).toBe("clinic@clinic.test");
  });

  it("normalizes Indian numbers to 10 digits", () => {
    expect(normalizeRazorpayContactPhone("+91-98765-43210")).toBe("9876543210");
  });
});
