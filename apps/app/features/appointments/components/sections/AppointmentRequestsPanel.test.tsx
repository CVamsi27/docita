import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppointmentRequestResponse } from "@workspace/types";
import { ApiError } from "@/lib/errors";
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
  useDoctorAvailabilitySlots: () => ({
    data: [],
  }),
}));

vi.mock("@/lib/errors/user-facing-errors", async (importOriginal) => {
  const mod =
    await importOriginal<typeof import("@/lib/errors/user-facing-errors")>();
  return {
    ...mod,
    showUserFacingErrorToast: appointmentMocks.showError,
  };
});

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

vi.mock("@/lib/utils/doctor-availability-first-slot", () => ({
  fetchFirstAvailableDatetimeLocal: vi.fn().mockResolvedValue(null),
  fetchNextAvailableSlotWindow: vi.fn().mockResolvedValue(null),
}));

const appointmentRequest: AppointmentRequestResponse = {
  id: "req_1",
  patientId: "patient_1",
  clinicId: "clinic_1",
  preferredDoctorId: null,
  preferredDate: "2026-06-12T00:00:00.000Z",
  preferredTime: "09:30",
  reason: "Fever and cough",
  notes: "Patient requested morning slot",
  status: "PENDING",
  reviewedById: null,
  reviewedAt: null,
  responseMessage: null,
  createdAt: "2026-05-30T00:00:00.000Z",
  updatedAt: "2026-05-30T00:00:00.000Z",
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
    appointmentMocks.useAppointmentRequests.mockImplementation(
      (options?: { status?: string }) => ({
        data:
          options?.status === "PENDING"
            ? { items: [appointmentRequest], count: 1, hasMore: false }
            : { items: [], count: 0, hasMore: false },
        isLoading: false,
        isError: false,
        refetch: appointmentMocks.refetch,
      }),
    );
  });

  it("approves a patient appointment request with the default doctor and times", async () => {
    render(<AppointmentRequestsPanel />);

    expect(screen.getByText("Asha Rao")).toBeInTheDocument();
    expect(screen.getByText(/Fever and cough/i)).toBeInTheDocument();
    expect(screen.getByText(/1 pending/)).toBeInTheDocument();
    expect(screen.getAllByText(/9:30 AM/i).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: /Approve at/i }));

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

  it("does not load past requests until the history section is expanded", () => {
    render(<AppointmentRequestsPanel />);

    expect(appointmentMocks.useAppointmentRequests).toHaveBeenNthCalledWith(1, {
      status: "PENDING",
      limit: 50,
    });
    expect(appointmentMocks.useAppointmentRequests).toHaveBeenNthCalledWith(2, null);
    expect(appointmentMocks.useAppointmentRequests).toHaveBeenNthCalledWith(3, null);
  });

  it("disables submit until a reject reason is provided and submits trimmed text", async () => {
    render(<AppointmentRequestsPanel />);

    fireEvent.click(screen.getByRole("button", { name: "Reject" }));
    const submitButton = screen.getByRole("button", {
      name: /Reject request/i,
    });
    expect(submitButton).toBeDisabled();
    expect(appointmentMocks.rejectMutateAsync).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("combobox", { name: /Reason/i }));
    fireEvent.click(screen.getByRole("option", { name: /Custom message/i }));
    fireEvent.change(screen.getByLabelText(/Message for patient/i), {
      target: { value: "  Please call the front desk for a safer slot.  " },
    });
    fireEvent.click(screen.getByRole("button", { name: /Reject request/i }));

    await waitFor(() => {
      expect(appointmentMocks.rejectMutateAsync).toHaveBeenCalledWith({
        id: "req_1",
        responseMessage: "Please call the front desk for a safer slot.",
      });
    });
  });

  it("highlights schedule fields when approve fails with a conflicting slot", async () => {
    appointmentMocks.approveMutateAsync.mockRejectedValueOnce(
      new ApiError("ignored", 400, "VALIDATION_ERROR", {
        detail: "Doctor has conflicting appointment",
      }),
    );

    render(<AppointmentRequestsPanel />);

    fireEvent.click(screen.getByRole("button", { name: /Approve at/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/overlaps another visit/i),
      ).toBeInTheDocument();
    });
    expect(appointmentMocks.showError).not.toHaveBeenCalled();
  });

  it("shows a sanitized reject message when reject fails", async () => {
    appointmentMocks.rejectMutateAsync.mockRejectedValueOnce(
      new ApiError("ignored", 400, "VALIDATION_ERROR", {
        detail: "Only pending appointment requests can be reviewed",
      }),
    );

    render(<AppointmentRequestsPanel />);

    fireEvent.click(screen.getByRole("button", { name: "Reject" }));
    fireEvent.click(screen.getByRole("combobox", { name: /Reason/i }));
    fireEvent.click(screen.getByRole("option", { name: /Doctor unavailable/i }));
    fireEvent.click(screen.getByRole("button", { name: /Reject request/i }));

    await waitFor(() => {
      expect(appointmentMocks.showError).toHaveBeenCalledWith(
        null,
        "Only pending appointment requests can be reviewed",
        "generic",
      );
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
