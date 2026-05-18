import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConsultationNotesModal } from "./ConsultationNotesModal";
import { VitalsModal } from "./VitalsModal";

const clinicalMocks = vi.hoisted(() => ({
  saveVitals: vi.fn(),
  updateAppointment: vi.fn(),
  showError: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("@/hooks/api/use-clinical", () => ({
  useSaveVitals: () => ({
    mutateAsync: clinicalMocks.saveVitals,
    isPending: false,
  }),
}));

vi.mock("@workspace/data-access", () => ({
  useUpdateAppointment: () => ({
    mutateAsync: clinicalMocks.updateAppointment,
    isPending: false,
  }),
}));

vi.mock("@/lib/errors/user-facing-errors", () => ({
  showUserFacingErrorToast: clinicalMocks.showError,
}));

vi.mock("sonner", () => ({
  toast: {
    success: clinicalMocks.toastSuccess,
  },
}));

describe("consultation modals", () => {
  beforeEach(() => {
    clinicalMocks.saveVitals.mockReset();
    clinicalMocks.updateAppointment.mockReset();
    clinicalMocks.showError.mockReset();
    clinicalMocks.toastSuccess.mockReset();
  });

  it("blocks saving vitals until at least one measurement is entered", () => {
    render(
      <VitalsModal
        open
        onOpenChange={vi.fn()}
        appointmentId="appt_1"
        patientName="Asha Rao"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Save Vitals" }));

    expect(clinicalMocks.saveVitals).not.toHaveBeenCalled();
    expect(clinicalMocks.showError).toHaveBeenCalledWith(
      "Enter at least one vital sign before saving",
    );
  });

  it("saves only entered vitals and closes on success", async () => {
    clinicalMocks.saveVitals.mockResolvedValue(undefined);
    const onOpenChange = vi.fn();
    const onSaved = vi.fn();

    render(
      <VitalsModal
        open
        onOpenChange={onOpenChange}
        appointmentId="appt_1"
        patientName="Asha Rao"
        onSaved={onSaved}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("Weight"), {
      target: { value: "64.5" },
    });
    fireEvent.change(screen.getByPlaceholderText("SpO2"), {
      target: { value: "99" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Vitals" }));

    await waitFor(() => {
      expect(clinicalMocks.saveVitals).toHaveBeenCalledWith({
        appointmentId: "appt_1",
        weight: 64.5,
        spo2: 99,
      });
    });
    expect(onSaved).toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("keeps clinical notes disabled until meaningful text is entered", async () => {
    clinicalMocks.updateAppointment.mockResolvedValue(undefined);
    const onOpenChange = vi.fn();
    const onSaved = vi.fn().mockResolvedValue(undefined);

    render(
      <ConsultationNotesModal
        open
        onOpenChange={onOpenChange}
        appointmentId="appt_1"
        patientName="Asha Rao"
        onSaved={onSaved}
      />,
    );

    expect(screen.getByRole("button", { name: "Save Notes" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Observations"), {
      target: { value: "Patient reports improvement after medication." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Notes" }));

    await waitFor(() => {
      expect(clinicalMocks.updateAppointment).toHaveBeenCalledWith({
        notes: "Patient reports improvement after medication.",
      });
    });
    expect(onSaved).toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
