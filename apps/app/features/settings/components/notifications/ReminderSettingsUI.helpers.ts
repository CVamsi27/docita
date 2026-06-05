import type { ReminderSettingsFormValues } from "@workspace/types";

export const TIME_UNITS = [
  { value: "minute", label: "Minutes" },
  { value: "hour", label: "Hours" },
  { value: "day", label: "Days" },
  { value: "week", label: "Weeks" },
] as const;

export function buildReminderSettingsPayload(
  values: ReminderSettingsFormValues,
) {
  return {
    reminderBefore: values.appointment.enabled
      ? values.appointment.before
      : undefined,
    reminderUnit: values.appointment.enabled
      ? values.appointment.unit
      : undefined,
    followUpReminderEnabled: values.followUp.enabled,
    followUpReminderBefore: values.followUp.before,
    followUpReminderUnit: values.followUp.unit,
    paymentReminderEnabled: values.overduePayment.enabled,
    paymentReminderDays: values.overduePayment.enabled
      ? values.overduePayment.daysAfterDue
      : [],
    paymentReminderAutoSendWhatsApp: values.overduePayment.autoSendWhatsApp,
    prescriptionReminderEnabled: values.prescription.enabled,
    prescriptionReminderBefore: values.prescription.before,
    prescriptionReminderUnit: values.prescription.unit,
    scheduleNotificationEnabled: values.schedule.enabled,
    scheduleNotificationBefore: values.schedule.before,
    scheduleNotificationUnit: values.schedule.unit,
  };
}
