import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppointmentRequestResponse } from "@workspace/types";
import { AppointmentRequestsPanel } from "./AppointmentRequestsPanel";

const appointmentMocks = vi.hoisted(() => ({
  useAppointmentRequests: vi.fn(),
  approveMutateAsync: vi.fn(),
  rejectMutateAsync: vi.fn(),
  doctors: [
    { id: "doctor_1", name: "Dr. Asha", role: "DOCTOR" },
    { id: "staff_1", name: "Reception", role: "STAFF" },
  ],
  showError: vi.fn(),
  refetch: vi.fn(),
}));

vi.mock("@/hooks/api/use-appointments", () => ({
  useAppointmentRequests: appointmentMocks.useAppointmentRequests,
  useApproveAppointmentRequest: () => ({
    isPending: false,
    mutateAsync: appointmentMocks.approveMutateAsync,
  }),
  useRejectAppointmentRequest: () => ({
    isPending: false,
    mutateAsync: appointmentMocks.rejectMutateAsync,
  }),
}));

vi.mock("@/hooks/api/use-settings", () => ({
  useDoctors: () => ({
    data: appointmentMocks.doctors,
  }),
}));

vi.mock("@/lib/user-facing-errors", () => ({
  showUserFacingErrorToast: appointmentMocks.showError,
}));

vi.mock("@/lib/doctor-availability-first-slot", () => ({
  fetchFirstAvailableDatetimeLocal: vi
    .fn()
    .mockResolvedValue(null),
}));

const appointmentRequest: AppointmentRequestResponse = {
  id: "req_1",
  patientId: "patient_1",
  clinicId: "clinic_1",
  preferredDoctorId: null,
  preferredDate: "2026-05-12T00:00:00.000Z",
  preferredTime: "09:30",
  reason: "Fever and cough",
  notes: "Patient requested morning slot",
  status: "PENDING",
  reviewedById: null,
  reviewedAt: null,
  responseMessage: null,
  createdAt: "2026-04-30T00:00:00.000Z",
  updatedAt: "2026-04-30T00:00:00.000Z",
  patient: {
    id: "patient_1",
    firstName: "Asha",
    lastName: "Rao",
    phoneNumber: "9000000000",
  },
};

describe("AppointmentRequestsPanel", () => {
  beforeEach(() => {
    appointmentMocks.approveMutateAsync.mockReset();
    appointmentMocks.rejectMutateAsync.mockReset();
    appointmentMocks.showError.mockReset();
    appointmentMocks.refetch.mockReset();
    appointmentMocks.doctors = [
      { id: "doctor_1", name: "Dr. Asha", role: "DOCTOR" },
      { id: "staff_1", name: "Reception", role: "STAFF" },
    ];
    appointmentMocks.useAppointmentRequests.mockReturnValue({
      data: { items: [appointmentRequest], count: 1, hasMore: false },
      isLoading: false,
      isError: false,
      refetch: appointmentMocks.refetch,
    });
  });

  it("approves a patient appointment request with the default doctor and times", async () => {
    render(<AppointmentRequestsPanel />);

    expect(screen.getByText("Asha Rao")).toBeInTheDocument();
    expect(screen.getByText("Fever and cough")).toBeInTheDocument();
    expect(screen.getByText("1 pending")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Approve/i }));

    await waitFor(() => {
      expect(appointmentMocks.approveMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "req_1",
          doctorId: "doctor_1",
          type: "Consultation",
          notes: "Patient requested morning slot",
        }),
      );
    });
    expect(appointmentMocks.rejectMutateAsync).not.toHaveBeenCalled();
  });

  it("requires a rejection response before rejecting and submits trimmed text", async () => {
    render(<AppointmentRequestsPanel />);

    fireEvent.click(screen.getByRole("button", { name: /Reject/i }));
    expect(appointmentMocks.showError).toHaveBeenCalledWith(
      null,
      "Enter a response before rejecting this request.",
      "form",
    );
    expect(appointmentMocks.rejectMutateAsync).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText("Reject response"), {
      target: { value: "  Please call the front desk for a safer slot.  " },
    });
    fireEvent.click(screen.getByRole("button", { name: /Reject/i }));

    await waitFor(() => {
      expect(appointmentMocks.rejectMutateAsync).toHaveBeenCalledWith({
        id: "req_1",
        responseMessage: "Please call the front desk for a safer slot.",
      });
    });
  });

  it("shows empty, loading, and error states", () => {
    appointmentMocks.useAppointmentRequests.mockReturnValue({
      data: { items: [], count: 0, hasMore: false },
      isLoading: false,
      isError: false,
      refetch: appointmentMocks.refetch,
    });
    const { rerender } = render(<AppointmentRequestsPanel />);
    expect(screen.getByText("No pending requests")).toBeInTheDocument();

    appointmentMocks.useAppointmentRequests.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: appointmentMocks.refetch,
    });
    rerender(<AppointmentRequestsPanel />);
    expect(screen.getByText("Loading appointment requests…")).toBeInTheDocument();

    appointmentMocks.useAppointmentRequests.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: appointmentMocks.refetch,
    });
    rerender(<AppointmentRequestsPanel />);
    expect(
      screen.getByText("We could not load appointment requests"),
    ).toBeInTheDocument();
  });
});
