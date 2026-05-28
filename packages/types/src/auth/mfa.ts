import { z } from 'zod';

/** Plain backup codes shown once to the user during MFA setup. */
export const mfaPlainBackupCodeSchema = z
  .string()
  .trim()
  .min(8)
  .max(32)
  .regex(/^[A-Za-z0-9_-]+$/);

export const mfaPlainBackupCodesSchema = z
  .array(mfaPlainBackupCodeSchema)
  .min(1)
  .max(16);

/** Bcrypt hashes persisted on `User.mfaBackupCodes`. */
export const mfaHashedBackupCodeSchema = z.string().min(20).max(128);

export const mfaHashedBackupCodesSchema = z
  .array(mfaHashedBackupCodeSchema)
  .max(16);

export type MfaPlainBackupCode = z.infer<typeof mfaPlainBackupCodeSchema>;
export type MfaHashedBackupCodes = z.infer<typeof mfaHashedBackupCodesSchema>;
