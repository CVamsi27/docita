import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClinicRegistrationForm } from "./clinic-registration-form";

const mocks = vi.hoisted(() => ({
  restartOnboarding: vi.fn(),
  restoreOnboardingId: vi.fn(),
}));

vi.mock("@/lib/auth/auth-context", () => ({
  useAuth: () => ({
    user: {
      id: "user_1",
      name: "Owner",
      email: "owner@example.com",
      role: "ADMIN",
    },
  }),
}));

vi.mock("@/hooks/use-locale-currency", () => ({
  useLocaleCurrency: () => ({ currency: "INR" }),
}));

vi.mock("@/features/onboarding/components/steps", () => ({
  ClinicDetailsStep: () => <div>Clinic Details</div>,
  ComplianceStep: () => <div>Compliance</div>,
  PlanSelectionStep: () => <div>Plan Selection</div>,
  TeamInviteStep: () => <div>Team Invite</div>,
}));

vi.mock("@/features/onboarding/components/steps/PaymentStep", () => ({
  PaymentStep: () => <div>Payment</div>,
}));

vi.mock("@/features/onboarding/hooks/use-clinic-registration-flow", () => ({
  useClinicRegistrationFlow: () => ({
    step: 1,
    formData: {
      clinicDetails: {},
      planSelection: {
        tier: "CAPTURE",
        billingCycle: "MONTHLY",
        isCoreTrial: true,
      },
      compliance: {},
    },
    onboardingId: null,
    restoreOnboardingId: mocks.restoreOnboardingId,
    ensureOnboardingId: vi.fn(),
    restartOnboarding: mocks.restartOnboarding,
    setClinicDetails: vi.fn(),
    setPlanSelection: vi.fn(),
    setTeamMembers: vi.fn(),
    goBackFromCompliance: vi.fn(),
    setComplianceDraft: vi.fn(),
    submitRegistration: vi.fn(),
  }),
}));

describe("ClinicRegistrationForm", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    mocks.restartOnboarding.mockReset();
    mocks.restoreOnboardingId.mockReset();
  });

  it("fully resets onboarding when Start over is clicked from draft dialog", async () => {
    localStorage.setItem(
      "docita_onboarding_draft",
      JSON.stringify({
        clinicDetails: { name: "Draft Clinic" },
        savedAt: new Date().toISOString(),
        onboardingId: "onb_draft_1",
      }),
    );

    render(<ClinicRegistrationForm onSuccess={vi.fn()} />);

    expect(
      screen.getByText("Continue where you left off?"),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Start over" }));

    await waitFor(() => {
      expect(mocks.restartOnboarding).toHaveBeenCalledTimes(1);
    });
    expect(localStorage.getItem("docita_onboarding_draft")).toBeNull();
    expect(
      screen.queryByText("Continue where you left off?"),
    ).not.toBeInTheDocument();
  });
});
