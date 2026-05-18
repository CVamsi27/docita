import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import VerifyEmailVerifiedPage from "./page";

const mocks = vi.hoisted(() => ({
  router: {
    push: vi.fn(),
  },
  user: null as
    | {
        clinicId?: string | null;
        onboardingStep?:
          | "NOT_STARTED"
          | "CHOOSE_PATH"
          | "CREATING_CLINIC"
          | "JOINING_CLINIC"
          | "COMPLETED";
      }
    | null,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => mocks.router,
}));

vi.mock("@/lib/auth/auth-context", () => ({
  useAuth: () => ({
    user: mocks.user,
  }),
}));

describe("VerifyEmailVerifiedPage", () => {
  beforeEach(() => {
    mocks.router.push.mockReset();
    mocks.user = null;
  });

  it("shows the verified state with a continue action", () => {
    render(<VerifyEmailVerifiedPage />);

    expect(screen.getByText("Verified")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Continue" }),
    ).toBeInTheDocument();
  });

  it("sends signed-out users back to login with the verified page as next", () => {
    render(<VerifyEmailVerifiedPage />);

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(mocks.router.push).toHaveBeenCalledWith(
      "/login?next=/verify-email/verified",
    );
  });

  it("routes users without a clinic back into onboarding", () => {
    mocks.user = {
      clinicId: null,
      onboardingStep: "CREATING_CLINIC",
    };

    render(<VerifyEmailVerifiedPage />);

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(mocks.router.push).toHaveBeenCalledWith("/onboarding");
  });

  it("routes completed users to their workspace", () => {
    mocks.user = {
      clinicId: "clinic-1",
      onboardingStep: "COMPLETED",
    };

    render(<VerifyEmailVerifiedPage />);

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(mocks.router.push).toHaveBeenCalledWith("/today");
  });
});
