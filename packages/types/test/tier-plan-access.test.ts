import { describe, expect, it } from "vitest";
import { PUBLISHED_PLAN_LADDER, tierSchema } from "../src";

describe("tier plan feature access parity", () => {
  it("parses billed SKUs through tierSchema", () => {
    for (const sku of PUBLISHED_PLAN_LADDER) {
      expect(() => tierSchema.parse(sku)).not.toThrow();
    }
  });
});
