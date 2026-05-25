import { z } from "zod";
import { appClinicSettingsSchema } from "../contracts/app";

export const reminderTimeUnitSchema = z.enum([
  "minute",
  "hour",
  "day",
  "week",
]);

export type ReminderTimeUnit = z.infer<typeof reminderTimeUnitSchema>;

const reminderBlockFormSchema = z.object({
  enabled: z.boolean(),
  before: z
    .string()
    .trim()
    .optional()
    .refine(
      (value) =>
        value === undefined || value === "" || /^[0-9]+$/.test(value),
      "Enter a valid number",
    ),
  unit: reminderTimeUnitSchema.optional(),
});

export const reminderSettingsFormSchema = z
  .object({
    appointment: reminderBlockFormSchema,
    followUp: reminderBlockFormSchema,
    invoice: reminderBlockFormSchema,
    prescription: reminderBlockFormSchema,
    schedule: reminderBlockFormSchema,
  })
  .superRefine((data, ctx) => {
    const blocks: Array<keyof typeof data> = [
      "appointment",
      "followUp",
      "invoice",
      "prescription",
      "schedule",
    ];

    for (const key of blocks) {
      const block = data[key];
      if (!block.enabled) continue;

      const before = Number(block.before);
      if (!block.before || Number.isNaN(before) || before < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key, "before"],
          message: "Enter a value of 1 or more",
        });
      }
      if (!block.unit) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key, "unit"],
          message: "Select a time unit",
        });
      }
    }
  });

export type ReminderSettingsFormValues = z.infer<
  typeof reminderSettingsFormSchema
>;

function parseReminderTimeUnit(
  value: unknown,
  fallback: ReminderTimeUnit,
): ReminderTimeUnit {
  const parsed = reminderTimeUnitSchema.safeParse(value);
  return parsed.success ? parsed.data : fallback;
}

/** Map persisted clinic settings JSON into reminder settings form defaults. */
export function reminderFormValuesFromClinicSettings(
  settings: unknown,
): ReminderSettingsFormValues {
  const parsed = appClinicSettingsSchema.safeParse(settings);
  const clinic = parsed.success ? parsed.data : {};

  return {
    appointment: {
      enabled: clinic.reminderBefore !== undefined,
      before: String(clinic.reminderBefore ?? "1"),
      unit: parseReminderTimeUnit(clinic.reminderUnit, "day"),
    },
    followUp: {
      enabled: clinic.followUpReminderEnabled ?? false,
      before: String(clinic.followUpReminderBefore ?? "1"),
      unit: parseReminderTimeUnit(clinic.followUpReminderUnit, "day"),
    },
    invoice: {
      enabled: clinic.invoiceReminderEnabled ?? false,
      before: String(clinic.invoiceReminderBefore ?? "3"),
      unit: parseReminderTimeUnit(clinic.invoiceReminderUnit, "day"),
    },
    prescription: {
      enabled: clinic.prescriptionReminderEnabled ?? false,
      before: String(clinic.prescriptionReminderBefore ?? "1"),
      unit: parseReminderTimeUnit(clinic.prescriptionReminderUnit, "day"),
    },
    schedule: {
      enabled: clinic.scheduleNotificationEnabled ?? false,
      before: String(clinic.scheduleNotificationBefore ?? "1"),
      unit: parseReminderTimeUnit(clinic.scheduleNotificationUnit, "hour"),
    },
  };
}
