import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClinicOnboardingWizard } from "./clinic-onboarding-wizard";

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  authState: {
    user: {
      id: "user_1",
      name: "Owner",
      email: "owner@clinic.com",
      role: "ADMIN_DOCTOR",
      clinicId: null,
    },
    isLoading: false,
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mocks.replace,
  }),
}));

vi.mock("@/lib/auth/auth-context", () => ({
  useAuth: () => mocks.authState,
}));

vi.mock("@workspace/ui/components/indicators/docita-logo", () => ({
  DocitaLogo: () => <div>Docita</div>,
  DocitaIcon: () => <div>Docita Icon</div>,
}));

vi.mock("@/features/onboarding/components/forms/clinic-registration-form", () => ({
  ClinicRegistrationForm: ({ onSuccess }: { onSuccess: () => void }) => (
    <button type="button" onClick={onSuccess}>
      Complete Registration
    </button>
  ),
}));

describe("ClinicOnboardingWizard", () => {
  beforeEach(() => {
    mocks.replace.mockReset();
    mocks.authState = {
      user: {
        id: "user_1",
        name: "Owner",
        email: "owner@clinic.com",
        role: "ADMIN_DOCTOR",
        clinicId: null,
      },
      isLoading: false,
    };
  });

  it("shows transition loader and redirects admin doctors to verify-doctor after completion", () => {
    render(<ClinicOnboardingWizard />);

    fireEvent.click(screen.getByRole("button", { name: /complete registration/i }));

    expect(mocks.replace).toHaveBeenCalledWith("/verify-doctor");
    expect(
      screen.getByText(/Finalizing your registration/i),
    ).toBeInTheDocument();
  });

  it("redirects non-admin users to today after completion", () => {
    mocks.authState = {
      user: {
        id: "user_1",
        name: "Owner",
        email: "owner@clinic.com",
        role: "RECEPTIONIST",
        clinicId: null,
      },
      isLoading: false,
    };

    render(<ClinicOnboardingWizard />);

    fireEvent.click(screen.getByRole("button", { name: /complete registration/i }));

    expect(mocks.replace).toHaveBeenCalledWith("/today");
  });
});
