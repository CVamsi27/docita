import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import VerifyEmailSentPage from "./page";

const mocks = vi.hoisted(() => ({
  router: {
    replace: vi.fn(),
  },
  apiFetch: vi.fn(),
  logout: vi.fn(),
  loggerError: vi.fn(),
  showUserFacingErrorToast: vi.fn(),
  toastSuccess: vi.fn(),
  user: {
    email: "owner@example.com",
    emailVerified: false,
    clinicId: null,
    onboardingStep: "CHOOSE_PATH",
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => mocks.router,
}));

vi.mock("@/lib/auth-context", () => ({
  VERIFICATION_EMAIL_STATUS_STORAGE_KEY: "docita_verification_email_status",
  useAuth: () => ({
    user: mocks.user,
    logout: mocks.logout,
  }),
}));

vi.mock("@/lib/api-client", () => ({
  apiFetch: mocks.apiFetch,
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: mocks.loggerError,
  },
}));

vi.mock("@/lib/user-facing-errors", () => ({
  showUserFacingErrorToast: mocks.showUserFacingErrorToast,
}));

vi.mock("sonner", () => ({
  toast: {
    success: mocks.toastSuccess,
  },
}));

vi.mock("@/features/auth/components/PreDashboardShell", () => ({
  PreDashboardShell: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pre-dashboard-shell">{children}</div>
  ),
}));

describe("VerifyEmailSentPage", () => {
  beforeEach(() => {
    sessionStorage.clear();
    mocks.router.replace.mockReset();
    mocks.apiFetch.mockReset();
    mocks.logout.mockReset();
    mocks.loggerError.mockReset();
    mocks.showUserFacingErrorToast.mockReset();
    mocks.toastSuccess.mockReset();
    mocks.user = {
      email: "owner@example.com",
      emailVerified: false,
      clinicId: null,
      onboardingStep: "CHOOSE_PATH",
    };
  });

  it("shows the failed-delivery state from session storage", async () => {
    sessionStorage.setItem("docita_verification_email_status", "failed");

    render(<VerifyEmailSentPage />);

    expect(
      await screen.findByText(
        /the verification email could not be confirmed as sent/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /send verification email again/i }),
    ).toBeInTheDocument();
  });

  it("resends the verification email and stores a pending status on success", async () => {
    mocks.apiFetch.mockResolvedValue({ message: "Verification email sent" });

    render(<VerifyEmailSentPage />);

    fireEvent.click(
      screen.getByRole("button", { name: /resend verification email/i }),
    );

    await waitFor(() => {
      expect(mocks.apiFetch).toHaveBeenCalledWith(
        "/auth/resend-verification",
        { method: "POST" },
      );
    });

    expect(sessionStorage.getItem("docita_verification_email_status")).toBe(
      "pending",
    );
    expect(mocks.toastSuccess).toHaveBeenCalledWith(
      "Verification email resent. Check your inbox.",
    );
    expect(
      screen.getByRole("button", { name: /verification email sent/i }),
    ).toBeDisabled();
  });

  it("stores a failed status and shows an error toast when resend fails", async () => {
    mocks.apiFetch.mockRejectedValue(new Error("provider unavailable"));

    render(<VerifyEmailSentPage />);

    fireEvent.click(
      screen.getByRole("button", { name: /resend verification email/i }),
    );

    await waitFor(() => {
      expect(mocks.showUserFacingErrorToast).toHaveBeenCalledWith(
        "We could not resend the verification email right now. Please try again.",
      );
    });

    expect(sessionStorage.getItem("docita_verification_email_status")).toBe(
      "failed",
    );
    expect(mocks.loggerError).toHaveBeenCalled();
  });

  it("redirects already verified users to the next setup step", async () => {
    mocks.user = {
      email: "owner@example.com",
      emailVerified: true,
      clinicId: null,
      onboardingStep: "CHOOSE_PATH",
    };

    render(<VerifyEmailSentPage />);

    await waitFor(() => {
      expect(mocks.router.replace).toHaveBeenCalledWith("/choose-path");
    });
  });
});
