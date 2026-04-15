import { describe, expect, it } from "vitest";
import { clinicDetailsSchema } from "@/features/onboarding/components/types";

describe("clinicDetailsSchema", () => {
  it("validates required clinic details fields", () => {
    const result = clinicDetailsSchema.safeParse({
      name: "A",
      email: "not-an-email",
      phone: "9876543210",
      address: "123 Medical Lane",
      type: "GENERAL",
      website: "",
      gstin: "",
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error("Expected validation to fail");
    }

    const messages = result.error.issues.map((issue) => issue.message);
    expect(messages).toContain("Use at least 2 characters");
    expect(messages).toContain("Please enter a valid email address");
  });
});
