import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MedicineReminderDialogUI } from "./MedicineReminderDialogUI";

describe("MedicineReminderDialogUI", () => {
  it("validates required medicine fields and phone format", async () => {
    const onSubmit = vi.fn();

    render(
      <MedicineReminderDialogUI
        isOpen
        isLoading={false}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(
      screen.getByPlaceholderText("+1234567890 (optional - auto-detected if empty)"),
      {
        target: { value: "123" },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: "Create Reminder" }));

    expect(await screen.findByText("Enter medicine name.")).toBeInTheDocument();
    expect(screen.getByText("Enter dosage.")).toBeInTheDocument();
    expect(screen.getByText("Enter at least 10 digits")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits a complete reminder with default frequency and time", async () => {
    const onSubmit = vi.fn();

    render(
      <MedicineReminderDialogUI
        isOpen
        isLoading={false}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("e.g., Aspirin, Metformin"), {
      target: { value: "Metformin" },
    });
    fireEvent.change(screen.getByPlaceholderText("e.g., 500mg, 1 tablet, 5ml"), {
      target: { value: "500mg" },
    });
    fireEvent.change(
      screen.getByPlaceholderText("+1234567890 (optional - auto-detected if empty)"),
      {
        target: { value: "+919000000000" },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: "Create Reminder" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });
    expect(onSubmit.mock.calls[0]?.[0]).toEqual({
      medicineName: "Metformin",
      dosage: "500mg",
      frequency: "once_daily",
      reminderTime: "09:00",
      patientPhone: "+919000000000",
    });
  });
});
