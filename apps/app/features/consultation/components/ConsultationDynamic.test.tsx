import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ClinicalDocumentationDynamic } from "./ConsultationDynamic";

vi.mock("./ConsultationFormRenderer", () => ({
  ConsultationFormRenderer: ({
    readOnly,
  }: {
    readOnly?: boolean;
  }) => <div data-testid="consultation-renderer" data-readonly={String(Boolean(readOnly))} />,
}));

vi.mock("./ConsultationProgressUI", () => ({
  ConsultationProgressUI: () => <div data-testid="consultation-progress" />,
}));

vi.mock("@/hooks/api/use-patients", () => ({
  usePatientWithMedicalHistory: () => ({
    data: undefined,
    isLoading: false,
  }),
}));

vi.mock("@/hooks/api/use-clinical", () => ({
  useCreatePrescription: () => ({
    mutateAsync: vi.fn(),
  }),
}));

vi.mock("@/hooks/api/use-appointments", () => ({
  useSyncDiagnoses: () => ({
    mutateAsync: vi.fn(),
  }),
}));

describe("ClinicalDocumentationDynamic", () => {
  it("locks finalized consultations into read-only mode", () => {
    render(
      <ClinicalDocumentationDynamic
        appointmentId="apt-1"
        patientId="patient-1"
        appointmentData={{
          appointmentId: "apt-1",
          patientId: "patient-1",
          doctorId: "doctor-1",
          patient: {
            id: "patient-1",
            firstName: "Asha",
            lastName: "Rao",
            dateOfBirth: "1992-01-01",
            gender: "FEMALE",
            phoneNumber: "9999999991",
          },
          status: "completed",
          startTime: "2026-04-18T10:00:00.000Z",
          type: "follow_up",
        }}
        defaultTab="chief-complaint"
        onSave={vi.fn()}
        clinicType="GENERAL"
        readOnly
      />,
    );

    expect(screen.queryByRole("button", { name: /Save Draft/i })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Complete Consultation/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("consultation-renderer")).toHaveAttribute(
      "data-readonly",
      "true",
    );
  });
});
