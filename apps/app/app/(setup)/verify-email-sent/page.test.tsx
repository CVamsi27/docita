import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import VerifyEmailSentPage from "./page";

const messages = {
  Onboarding: {
    verifyEmailSent: {
      verifiedTitle: "Email verified",
      verifiedSubtitle: "You can continue setup when you are ready.",
      continueButton: "Continue",
      backToLoginButton: "Back to login",
      checkEmailTitle: "Check your email",
      checkEmailSubtitle: "We sent a verification link to",
      checkEmailHint:
        "Use the verification link in the email before continuing with your clinic setup.",
      deliveryFailedTitle:
        "We created your account, but the verification email could not be confirmed as sent.",
      deliveryFailedBody:
        "Try sending it again now. If it still does not arrive, contact support so we can help you complete setup.",
      deliveryPendingBody: "Check your inbox and spam folder for a message from Docita.",
      deliveryPendingHint:
        "The link stays active for 24 hours and you can request a fresh one anytime.",
      sendingButton: "Sending…",
      resendCooldownButton: "Verification email sent",
      resendAfterFailureButton: "Send verification email again",
      resendButton: "Resend verification email",
      cooldownRemainingLabel: "You can resend again in {time}.",
      wrongEmailLabel: "Wrong email?",
      signOutAndRetryButton: "Sign out and try again",
    },
  },
  Common: {
    cancel: "Cancel",
    save: "Save",
  },
};

function renderWithIntl(node: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {node}
    </NextIntlClientProvider>,
  );
}

const VERIFICATION_EMAIL_COOLDOWN_MS = 120 * 1000;

const mocks = vi.hoisted(() => ({
  router: {
    replace: vi.fn(),
    push: vi.fn(),
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
  usePathname: () => "/",
  useRouter: () => mocks.router,
}));

vi.mock("@/lib/auth/auth-context", () => ({
  VERIFICATION_EMAIL_STATUS_STORAGE_KEY: "docita_verification_email_status",
  useAuth: () => ({
    user: mocks.user,
    logout: mocks.logout,
  }),
}));

vi.mock("@/lib/api/api-client", () => ({
  apiFetch: mocks.apiFetch,
}));

vi.mock("@/lib/monitoring/logger", () => ({
  logger: {
    error: mocks.loggerError,
  },
}));

vi.mock("@/lib/errors/user-facing-errors", () => ({
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
    vi.useRealTimers();
    sessionStorage.clear();
    mocks.router.replace.mockReset();
    mocks.router.push.mockReset();
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

  it("re-enables resend after the cooldown expires", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    mocks.apiFetch.mockResolvedValue({ message: "Verification email sent" });

    renderWithIntl(<VerifyEmailSentPage />);

    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: /resend verification email/i }),
      );
    });

    expect(mocks.apiFetch).toHaveBeenCalledWith(
      "/auth/resend-verification",
      { method: "POST" },
    );

    expect(
      screen.getByRole("button", { name: /verification email sent/i }),
    ).toBeDisabled();
    expect(
      screen.getByText(/you can resend again in 2m 00s\./i),
    ).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(VERIFICATION_EMAIL_COOLDOWN_MS);
    });

    expect(
      screen.getByRole("button", { name: /resend verification email/i }),
    ).toBeEnabled();
  });

  it("shows the failed-delivery state from session storage", async () => {
    sessionStorage.setItem("docita_verification_email_status", "failed");

    renderWithIntl(<VerifyEmailSentPage />);

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

    renderWithIntl(<VerifyEmailSentPage />);

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
      await screen.findByRole("button", { name: /verification email sent/i }),
    ).toBeDisabled();
  });

  it("stores a failed status and shows an error toast when resend fails", async () => {
    mocks.apiFetch.mockRejectedValue(new Error("provider unavailable"));

    renderWithIntl(<VerifyEmailSentPage />);

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

  it("shows verified state for already verified users", async () => {
    mocks.user = {
      email: "owner@example.com",
      emailVerified: true,
      clinicId: null,
      onboardingStep: "CHOOSE_PATH",
    };

    renderWithIntl(<VerifyEmailSentPage />);

    expect(
      await screen.findByRole("heading", { name: /email verified/i }),
    ).toBeInTheDocument();
    expect(mocks.router.replace).not.toHaveBeenCalled();
  });

  afterEach(() => {
    vi.useRealTimers();
  });
});
