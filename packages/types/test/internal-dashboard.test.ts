import { describe, expect, it } from "vitest";
import { internalClinicListResponseSchema } from "../src/admin/internal";

const clinic = {
  id: "clinic-1",
  name: "Alpha Clinic",
  email: "alpha@example.test",
  phone: "+919000000001",
  address: "Fixture address",
  tier: "STARTER",
  active: true,
  subscriptionStatus: "ACTIVE",
  createdAt: "2026-10-08T00:00:00Z",
  type: "GENERAL",
  _count: { users: 3, patients: 7 },
};

describe("internal dashboard clinic wire contract", () => {
  it("accepts the selected clinic fields inside the API cursor envelope", () => {
    const payload = {
      items: [clinic],
      nextCursor: "clinic-1",
      hasMore: true,
      count: 1,
    };
    expect(internalClinicListResponseSchema.parse(payload)).toEqual(payload);
  });
  it("rejects an array or a malformed count instead of inventing an empty page", () => {
    expect(internalClinicListResponseSchema.safeParse([clinic]).success).toBe(
      false,
    );
    expect(
      internalClinicListResponseSchema.safeParse({
        items: [clinic],
        hasMore: false,
        count: "one",
      }).success,
    ).toBe(false);
  });
});
