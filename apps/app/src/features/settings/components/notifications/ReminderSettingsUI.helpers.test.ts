import { describe, expect, it } from "vitest";
import type { ReminderSettingsFormValues } from "@workspace/types";
import { buildReminderSettingsPayload } from "./reminder-settings-ui.helpers";

function formValues(
  overrides: Partial<ReminderSettingsFormValues> = {},
): ReminderSettingsFormValues {
  return {
    appointment: { enabled: true, before: "2", unit: "day" },
    followUp: { enabled: false, before: "1", unit: "day" },
    prescription: { enabled: false, before: "1", unit: "day" },
    schedule: { enabled: false, before: "1", unit: "hour" },
    overduePayment: { enabled: true, autoSendWhatsApp: true, daysAfterDue: [1, 3, 7] },
    ...overrides,
  };
}

describe("buildReminderSettingsPayload", () => {
  it("maps enabled appointment block into reminderBefore/reminderUnit", () => {
    const payload = buildReminderSettingsPayload(formValues());

    expect(payload.reminderBefore).toBe("2");
    expect(payload.reminderUnit).toBe("day");
  });

  it("drops reminderBefore/reminderUnit when the appointment reminder is disabled", () => {
    const payload = buildReminderSettingsPayload(
      formValues({
        appointment: { enabled: false, before: "2", unit: "day" },
      }),
    );

    expect(payload.reminderBefore).toBeUndefined();
    expect(payload.reminderUnit).toBeUndefined();
  });

  it("passes through follow-up block flags and timing", () => {
    const payload = buildReminderSettingsPayload(
      formValues({
        followUp: { enabled: true, before: "3", unit: "week" },
      }),
    );

    expect(payload.followUpReminderEnabled).toBe(true);
    expect(payload.followUpReminderBefore).toBe("3");
    expect(payload.followUpReminderUnit).toBe("week");
  });

  it("passes through prescription and schedule blocks", () => {
    const payload = buildReminderSettingsPayload(
      formValues({
        prescription: { enabled: true, before: "1", unit: "day" },
        schedule: { enabled: true, before: "6", unit: "hour" },
      }),
    );

    expect(payload.prescriptionReminderEnabled).toBe(true);
    expect(payload.prescriptionReminderBefore).toBe("1");
    expect(payload.scheduleNotificationEnabled).toBe(true);
    expect(payload.scheduleNotificationBefore).toBe("6");
    expect(payload.scheduleNotificationUnit).toBe("hour");
  });

  it("keeps payment days when overdue reminders are enabled", () => {
    const payload = buildReminderSettingsPayload(formValues());

    expect(payload.paymentReminderEnabled).toBe(true);
    expect(payload.paymentReminderDays).toEqual([1, 3, 7]);
    expect(payload.paymentReminderAutoSendWhatsApp).toBe(true);
  });

  it("empties payment days when overdue reminders are disabled", () => {
    const payload = buildReminderSettingsPayload(
      formValues({
        overduePayment: {
          enabled: false,
          autoSendWhatsApp: false,
          daysAfterDue: [1, 3, 7],
        },
      }),
    );

    expect(payload.paymentReminderEnabled).toBe(false);
    expect(payload.paymentReminderDays).toEqual([]);
  });
});
