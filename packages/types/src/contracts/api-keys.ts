import { z } from "zod";

export const apiKeyScopeSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9-]+:(?:read|write|\*)$/);

export const createApiKeySchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    scopes: z.array(apiKeyScopeSchema).min(1).max(50),
    expiresAt: z.string().datetime().optional(),
    allowedIps: z.array(z.string().ip()).max(50).optional(),
  })
  .strict();

export const rotateApiKeySchema = z
  .object({
    overlapMinutes: z
      .number()
      .int()
      .min(0)
      .max(24 * 60)
      .default(60),
  })
  .strict();

export type CreateApiKey = z.infer<typeof createApiKeySchema>;
export type RotateApiKey = z.infer<typeof rotateApiKeySchema>;
