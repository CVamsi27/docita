import { describe, expect, it } from "vitest";
import { abhaAddressSchema, abhaNumberSchema } from "../src/clinical/abdm";

describe("abhaAddressSchema", () => {
  it("accepts a valid ABHA address and lowercases it", () => {
    expect(abhaAddressSchema.parse("Asha.Verma@abdm")).toBe("asha.verma@abdm");
  });

  it("accepts sandbox and digit-bearing handles", () => {
    expect(abhaAddressSchema.parse("ravi_kumar1@sbx")).toBe("ravi_kumar1@sbx");
  });

  it.each([
    ["no @ suffix", "ashaverma"],
    ["too short local part", "ab@abdm"],
    ["leading separator", "_asha@abdm"],
    ["starts with digit", "1asha@abdm"],
    ["double separator", "asha..verma@abdm"],
    ["uppercase suffix rejected as non-letter", "asha@ABDM1"],
  ])("rejects %s", (_label, value) => {
    expect(abhaAddressSchema.safeParse(value).success).toBe(false);
  });
});

describe("abhaNumberSchema", () => {
  it("accepts a 14-digit number with hyphens and strips them", () => {
    expect(abhaNumberSchema.parse("12-3456-7890-1234")).toBe("12345678901234");
  });

  it("rejects non-14-digit numbers", () => {
    expect(abhaNumberSchema.safeParse("12345").success).toBe(false);
    expect(abhaNumberSchema.safeParse("abcd56789012345").success).toBe(false);
  });
});
