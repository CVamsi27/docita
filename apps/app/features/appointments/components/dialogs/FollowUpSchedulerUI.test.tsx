import { fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it, vi } from "vitest";
import { FollowUpSchedulerUI } from "./FollowUpSchedulerUI";

const messages = {
  Appointments: {
    followUpForm: {
      title: "Schedule follow-up",
      typeLabel: "Type",
      typePlaceholder: "Follow-up type",
      timeLabel: "Time",
      timePlaceholder: "Time",
      sendReminderLabel: "Send reminder",
      whenLabel: "When",
      whatsappNotificationLabel: "WhatsApp Notification",
      notesLabel: "Notes",
      notesPlaceholder: "Follow-up notes",
      scheduleButton: "Schedule",
      cancelButton: "Cancel",
      sendingButton: "Scheduling…",
    },
  },
  Common: {
    cancel: "Cancel",
    save: "Save",
  },
};

function renderWithIntl(node: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {node}
    </NextIntlClientProvider>,
  );
}

vi.mock("@/lib/contexts/clinic-context", () => ({
  useClinic: () => ({
    clinicId: "clinic_1",
    clinic: { timezone: "Asia/Kolkata" },
    setClinic: vi.fn(),
    userClinics: [],
    setUserClinics: vi.fn(),
    refreshClinic: vi.fn(),
  }),
}));

const followUpTypes = [
  { value: "follow_up", label: "Follow-up" },
  { value: "lab_review", label: "Lab review" },
];

const reminderOptions = [
  { value: 1, label: "1 day before" },
  { value: 3, label: "3 days before" },
];

function renderScheduler(overrides = {}) {
  const selectedDate = new Date("2026-05-12T10:00:00.000Z");
  const props = {
    open: true,
    onOpenChange: vi.fn(),
    loading: false,
    patientName: "Asha Rao",
    patientPhone: "+919000000000",
    selectedDate,
    onDateSelect: vi.fn(),
    selectedTime: "10:00",
    onTimeChange: vi.fn(),
    followUpType: "follow_up",
    onTypeChange: vi.fn(),
    reminderEnabled: true,
    onReminderEnabledChange: vi.fn(),
    reminderDays: 1,
    onReminderDaysChange: vi.fn(),
    whatsappReminder: true,
    onWhatsappReminderChange: vi.fn(),
    notes: "",
    onNotesChange: vi.fn(),
    onSchedule: vi.fn(),
    quickSchedules: [
      {
        label: "In 1 week",
        getValue: () => new Date("2026-05-07T10:00:00.000Z"),
      },
    ],
    onQuickSchedule: vi.fn(),
    followUpTypes,
    reminderOptions,
    ...overrides,
  };

  renderWithIntl(<FollowUpSchedulerUI {...props} />);
  return props;
}

describe("FollowUpSchedulerUI", () => {
  it("disables scheduling until a follow-up date is selected", () => {
    const props = renderScheduler({ selectedDate: undefined });

    expect(
      screen.getByText("Schedule a follow-up appointment for Asha Rao"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /^Schedule Follow-up$/ }),
    ).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "In 1 week" }));
    expect(props.onQuickSchedule).toHaveBeenCalledWith(
      new Date("2026-05-07T10:00:00.000Z"),
    );
  });

  it("updates reminder controls, notes, and schedules the follow-up", () => {
    const props = renderScheduler();

    expect(screen.getByText("Summary")).toBeInTheDocument();
    expect(screen.getByText("WhatsApp")).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText("WhatsApp Notification"));
    expect(props.onWhatsappReminderChange).toHaveBeenCalledWith(false);

    fireEvent.change(screen.getByPlaceholderText("Follow-up notes"), {
      target: { value: "Review symptoms after medication course." },
    });
    expect(props.onNotesChange).toHaveBeenCalledWith(
      "Review symptoms after medication course.",
    );

    fireEvent.click(screen.getByRole("button", { name: /^Schedule Follow-up$/ }));
    expect(props.onSchedule).toHaveBeenCalled();
  });
});
