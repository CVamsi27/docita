import { z } from "zod";

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
