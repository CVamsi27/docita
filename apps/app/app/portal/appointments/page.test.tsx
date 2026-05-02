import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PortalAppointmentsPage from "./page";

const portalAppointmentMocks = vi.hoisted(() => ({
  usePatientPortalAppointments: vi.fn(),
  mutateAsync: vi.fn(),
  refetch: vi.fn(),
  showError: vi.fn(),
}));

vi.mock("@/hooks/api/use-patient-portal", () => ({
  usePatientPortalAppointments: portalAppointmentMocks.usePatientPortalAppointments,
  useRequestAppointment: () => ({
    mutateAsync: portalAppointmentMocks.mutateAsync,
    isPending: false,
  }),
}));

vi.mock("@/lib/user-facing-errors", () => ({
  showUserFacingErrorToast: portalAppointmentMocks.showError,
}));

describe("PortalAppointmentsPage", () => {
  beforeEach(() => {
    portalAppointmentMocks.mutateAsync.mockReset();
    portalAppointmentMocks.refetch.mockReset();
    portalAppointmentMocks.showError.mockReset();
    portalAppointmentMocks.usePatientPortalAppointments.mockReturnValue({
      data: {
        appointments: [
          {
            id: "appt_1",
            doctorName: "Dr. Asha",
            clinicName: "Care Clinic",
            scheduledAt: "2026-05-12T09:30:00.000Z",
            status: "CONFIRMED",
          },
        ],
      },
      isLoading: false,
      isError: false,
      refetch: portalAppointmentMocks.refetch,
    });
  });

  it("submits a patient appointment request, resets fields, and refreshes appointments", async () => {
    portalAppointmentMocks.mutateAsync.mockResolvedValue({});

    render(<PortalAppointmentsPage />);

    fireEvent.change(screen.getByLabelText("Reason for visit"), {
      target: { value: "Fever and cough" },
    });
    fireEvent.change(screen.getByLabelText("Preferred date"), {
      target: { value: "2026-05-12" },
    });
    fireEvent.change(screen.getByLabelText("Preferred time"), {
      target: { value: "09:30" },
    });
    fireEvent.change(screen.getByLabelText("Additional notes"), {
      target: { value: "Morning slot preferred." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send Request" }));

    await waitFor(() => {
      expect(portalAppointmentMocks.mutateAsync).toHaveBeenCalledWith({
        preferredDate: "2026-05-12",
        preferredTime: "09:30",
        reason: "Fever and cough",
        notes: "Morning slot preferred.",
      });
    });
    expect(portalAppointmentMocks.refetch).toHaveBeenCalled();
    expect(screen.getByLabelText("Reason for visit")).toHaveValue("");
    expect(screen.getByLabelText("Preferred date")).toHaveValue("");
    expect(screen.getByLabelText("Preferred time")).toHaveValue("");
  });

  it("shows a friendly error when the request fails", async () => {
    const error = new Error("request failed");
    portalAppointmentMocks.mutateAsync.mockRejectedValue(error);

    render(<PortalAppointmentsPage />);

    fireEvent.change(screen.getByLabelText("Reason for visit"), {
      target: { value: "Follow-up visit" },
    });
    fireEvent.change(screen.getByLabelText("Preferred date"), {
      target: { value: "2026-05-12" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send Request" }));

    await waitFor(() => {
      expect(portalAppointmentMocks.showError).toHaveBeenCalledWith(
        error,
        "We could not send this appointment request. Please try again.",
        "form",
      );
    });
  });

  it("renders loading, empty, and error appointment list states", () => {
    portalAppointmentMocks.usePatientPortalAppointments.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: portalAppointmentMocks.refetch,
    });
    const { rerender } = render(<PortalAppointmentsPage />);
    expect(screen.getByText("Loading appointments…")).toBeInTheDocument();

    portalAppointmentMocks.usePatientPortalAppointments.mockReturnValue({
      data: { appointments: [] },
      isLoading: false,
      isError: false,
      refetch: portalAppointmentMocks.refetch,
    });
    rerender(<PortalAppointmentsPage />);
    expect(screen.getByText("No appointments found")).toBeInTheDocument();

    portalAppointmentMocks.usePatientPortalAppointments.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: portalAppointmentMocks.refetch,
    });
    rerender(<PortalAppointmentsPage />);
    expect(
      screen.getByText("We could not load your appointment list"),
    ).toBeInTheDocument();
  });
});
