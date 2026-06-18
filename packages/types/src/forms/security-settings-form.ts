import { z } from "zod";

// allow-no-base-schema: owner=settings reason=ui-security-settings review=2026-09-30
export const securitySettingsFormSchema = z.object({
  twoFactorAuth: z.boolean(),
  sessionTimeout: z
    .string()
    .min(1, "Enter a session timeout")
    .refine((value) => {
      const parsed = Number(value);
      return Number.isFinite(parsed) && parsed >= 5 && parsed <= 240;
    }, "Use a value between 5 and 240 minutes"),
  auditLogs: z.boolean(),
});

export type SecuritySettingsFormValues = z.infer<
  typeof securitySettingsFormSchema
>;
