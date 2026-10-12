import { describe, expect, it } from "vitest";
import { enterpriseAdjustmentInvoiceRequestSchema } from "../src/billing/enterprise-contract";

/**
 * E01 clause 2: `idempotencyKey` is what separates issuance from retry on
 * adjustment invoices. These pin the request contract, because the key is
 * required — a caller that omits it would otherwise double-bill on retry.
 */
describe("enterpriseAdjustmentInvoiceRequestSchema", () => {
  const valid = {
    label: "Migration support",
    amountCents: 1_234_500,
    idempotencyKey: "adj-migration-2026-06",
  };

  it("accepts a well-formed request", () => {
    expect(enterpriseAdjustmentInvoiceRequestSchema.parse(valid)).toEqual(valid);
  });

  it("requires an idempotencyKey so a retry cannot bill twice", () => {
    const { idempotencyKey: _omitted, ...withoutKey } = valid;
    const result = enterpriseAdjustmentInvoiceRequestSchema.safeParse(withoutKey);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes("idempotencyKey"))).toBe(
        true,
      );
    }
  });

  it("rejects a key that is too short to be a stable identity", () => {
    const result = enterpriseAdjustmentInvoiceRequestSchema.safeParse({
      ...valid,
      idempotencyKey: "short",
    });

    expect(result.success).toBe(false);
  });

  it("rejects characters that would corrupt the derived invoice number", () => {
    const result = enterpriseAdjustmentInvoiceRequestSchema.safeParse({
      ...valid,
      idempotencyKey: "adj/migration 2026",
    });

    expect(result.success).toBe(false);
  });

  it("keeps rejecting non-positive and non-integer amounts", () => {
    expect(
      enterpriseAdjustmentInvoiceRequestSchema.safeParse({
        ...valid,
        amountCents: 0,
      }).success,
    ).toBe(false);
    expect(
      enterpriseAdjustmentInvoiceRequestSchema.safeParse({
        ...valid,
        amountCents: 12.5,
      }).success,
    ).toBe(false);
  });
});