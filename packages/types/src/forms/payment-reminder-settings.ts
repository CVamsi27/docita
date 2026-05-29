import { z } from "zod";

/** Preset offsets (days after due date) aligned with billing scheduler defaults. */
export const PAYMENT_REMINDER_DAY_PRESETS = [1, 3, 7] as const;

const paymentReminderDaysArraySchema = z
  .array(z.number().int().min(1).max(30))
  .max(5, "At most five reminder days");

export const overduePaymentReminderFormSchema = z
  .object({
    enabled: z.boolean(),
    autoSendWhatsApp: z.boolean(),
    daysAfterDue: paymentReminderDaysArraySchema,
  })
  .superRefine((data, ctx) => {
    if (!data.enabled) return;
    if (data.daysAfterDue.length < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["daysAfterDue"],
        message: "Select at least one reminder day",
      });
    }
    const unique = new Set(data.daysAfterDue);
    if (unique.size !== data.daysAfterDue.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["daysAfterDue"],
        message: "Each reminder day can only be selected once",
      });
    }
  });

export type OverduePaymentReminderFormValues = z.infer<
  typeof overduePaymentReminderFormSchema
>;

export function overduePaymentFormFromClinicSettings(
  settings: unknown,
): OverduePaymentReminderFormValues {
  const record =
    settings !== null && typeof settings === "object" && !Array.isArray(settings)
      ? (settings as Record<string, unknown>)
      : {};

  const rawDays = Array.isArray(record.paymentReminderDays)
    ? record.paymentReminderDays
    : [...PAYMENT_REMINDER_DAY_PRESETS];

  const daysAfterDue = rawDays
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value >= 1 && value <= 30)
    .sort((a, b) => a - b);

  return {
    enabled: record.paymentReminderEnabled === true,
    autoSendWhatsApp: record.paymentReminderAutoSendWhatsApp !== false,
    daysAfterDue:
      daysAfterDue.length > 0 ? daysAfterDue : [...PAYMENT_REMINDER_DAY_PRESETS],
  };
}
