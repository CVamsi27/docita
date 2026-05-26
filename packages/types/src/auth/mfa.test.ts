import { describe, expect, it } from "vitest";
import {
  mfaHashedBackupCodesSchema,
  mfaPlainBackupCodesSchema,
} from "./mfa";

describe("mfa backup code schemas", () => {
  it("accepts plain backup codes from generator shape", () => {
    const codes = ["ABCD1234EF", "GHJK5678LM"];
    expect(mfaPlainBackupCodesSchema.parse(codes)).toEqual(codes);
  });

  it("rejects invalid plain backup codes", () => {
    expect(() => mfaPlainBackupCodesSchema.parse(["bad code!"])).toThrow();
  });

  it("accepts bcrypt-shaped hashed codes", () => {
    const hashed = [
      "$2b$10$abcdefghijklmnopqrstuvwx012345678901234567890",
      "$2b$10$zyxwvutsrqponmlkjihgfedcbazyxwvutsrqponmlkjihgfed",
    ];
    expect(mfaHashedBackupCodesSchema.parse(hashed)).toHaveLength(2);
  });
});
