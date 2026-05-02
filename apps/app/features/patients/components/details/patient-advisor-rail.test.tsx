import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Patient } from "@workspace/types";
import { PatientAdvisorRail } from "./patient-advisor-rail";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/features/_shared/hooks/use-feature-flag", () => ({
  useFeatureFlag: (key: string) =>
    key === "patient_advisor_drug_interactions" ? true : false,
}));

const mockPatient: Patient = {
  id: "patient-xyz",
  firstName: "Ada",
  lastName: "Lovelace",
  gender: "FEMALE",
  isolationStatus: "NONE",
  fallRisk: false,
  phoneNumber: "9000000001",
  email: "ada@example.com",
};

describe("PatientAdvisorRail", () => {
  it("renders nothing when there is no upstream advisor data", () => {
    const { container } = render(<PatientAdvisorRail patient={mockPatient} />);
    expect(container.firstChild).toBeNull();
  });

  it("surfaces a payments-due card when outstandingBalance > 0", () => {
    render(
      <PatientAdvisorRail patient={mockPatient} outstandingBalance={4500} />,
    );
    expect(screen.getByTestId("patient-advisor-rail")).toBeInTheDocument();
    expect(screen.getByText(/4,500/)).toBeInTheDocument();
    expect(screen.getByText(/PAYMENTS/)).toBeInTheDocument();
  });

  it("renders the consent card when consent is missing", () => {
    render(<PatientAdvisorRail patient={mockPatient} consentMissing />);
    expect(screen.getByText(/CONSENT/)).toBeInTheDocument();
    expect(
      screen.getByText(/Patient consent is missing or expired/),
    ).toBeInTheDocument();
  });

  it("renders drug-interaction card when feature flag is on", () => {
    render(
      <PatientAdvisorRail
        patient={mockPatient}
        drugInteractions={["Warfarin + NSAID", "Metformin + Contrast"]}
      />,
    );
    expect(screen.getByText(/DRUG INTERACTION/)).toBeInTheDocument();
    expect(screen.getByText(/2 potential interactions detected/)).toBeInTheDocument();
  });

  it("dismisses a card when its close button is clicked", () => {
    render(<PatientAdvisorRail patient={mockPatient} consentMissing />);
    const dismiss = screen.getByRole("button", { name: /Dismiss consent card/i });
    fireEvent.click(dismiss);
    expect(screen.queryByText(/CONSENT/)).not.toBeInTheDocument();
  });
});
