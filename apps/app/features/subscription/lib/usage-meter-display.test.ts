import { describe, expect, it } from "vitest";

import {
  formatUsageMeterCaption,
  usageMeterHasNoIncludedQuota,
  usageProgressPercentForBar,
} from "./usage-meter-display";

describe("usageProgressPercentForBar", () => {
  it("returns ratio capped at 100 when included quota exists", () => {
    expect(usageProgressPercentForBar(0, 100)).toBe(0);
    expect(usageProgressPercentForBar(50, 100)).toBe(50);
    expect(usageProgressPercentForBar(100, 100)).toBe(100);
    expect(usageProgressPercentForBar(200, 100)).toBe(100);
  });

  it("returns 100 when there is no included quota so the bar is not empty", () => {
    expect(usageProgressPercentForBar(0, 0)).toBe(100);
    expect(usageProgressPercentForBar(3, 0)).toBe(100);
  });
});

describe("formatUsageMeterCaption", () => {
  it("uses slash form when a quota exists", () => {
    expect(formatUsageMeterCaption(0, 500, "msgs")).toBe("0 / 500 msgs");
    expect(formatUsageMeterCaption(120, 500, "msgs")).toBe("120 / 500 msgs");
  });

  it("avoids 0 / 0 when there is no included quota", () => {
    expect(formatUsageMeterCaption(0, 0, "msgs")).toBe("Not included on plan");
    expect(formatUsageMeterCaption(5, 0, "msgs")).toBe(
      "5 msgs (no included quota)",
    );
  });
});

describe("usageMeterHasNoIncludedQuota", () => {
  it("detects zero or negative included caps", () => {
    expect(usageMeterHasNoIncludedQuota(0)).toBe(true);
    expect(usageMeterHasNoIncludedQuota(-1)).toBe(true);
    expect(usageMeterHasNoIncludedQuota(1)).toBe(false);
  });
});
