import { describe, expect, it } from "vitest";
import { whatsappOptInRatePercent } from "./whatsapp-opt-in-rate";

describe("whatsappOptInRatePercent", () => {
  it("returns 0 when there are no patients", () => {
    expect(whatsappOptInRatePercent(10, 0)).toBe(0);
  });

  it("returns rounded percentage when patients exist", () => {
    expect(whatsappOptInRatePercent(25, 100)).toBe(25);
    expect(whatsappOptInRatePercent(1, 3)).toBe(33);
  });

  it("returns 0 for non-finite inputs", () => {
    expect(whatsappOptInRatePercent(Number.NaN, 10)).toBe(0);
    expect(whatsappOptInRatePercent(1, Number.NaN)).toBe(0);
  });
});
