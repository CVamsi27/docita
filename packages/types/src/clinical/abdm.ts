import { z } from "zod";

/**
 * ABHA (Ayushman Bharat Health Account) address — the patient's PHR handle in
 * the ABDM ecosystem, e.g. `asha.verma@abdm` (or `@sbx` on the ABDM sandbox).
 *
 * Format per ABDM: a local part of 8–18 chars using lowercase letters, digits,
 * dot or underscore, that must start with a letter and cannot start/end with a
 * separator, followed by `@<provider-suffix>`. We validate shape only —
 * authoritative verification happens against the ABDM gateway (deferred to the
 * M1 gateway integration, which requires sandbox credentials).
 */
export const abhaAddressSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(
    /^(?=.{8,18}@)[a-z][a-z0-9]*(?:[._][a-z0-9]+)*@[a-z]{2,10}$/,
    "Enter a valid ABHA address, e.g. name@abdm",
  );

/** 14-digit ABHA number, accepted with or without the conventional hyphens. */
export const abhaNumberSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/-/g, ""))
  .pipe(z.string().regex(/^\d{14}$/, "ABHA number must be 14 digits"));

export type AbhaAddress = z.infer<typeof abhaAddressSchema>;
export type AbhaNumber = z.infer<typeof abhaNumberSchema>;
