import { describe, expect, it } from "vitest";
import { tierSchema, type TierName } from "../src";

const BILLABLE_PLAN_SKUS = [
  "STARTER",
  "FRONT_DESK",
  "ESSENTIAL",
  "PROFESSIONAL",
  "HOSPITAL",
  "ENTERPRISE",
] as const satisfies readonly TierName[];

describe("tier plan feature access parity", () => {
  it("parses billed SKUs through tierSchema", () => {
    for (const sku of PUBLISHED_PLAN_LADDER) {
      expect(() => tierSchema.parse(sku)).not.toThrow();
    }
  });
});
