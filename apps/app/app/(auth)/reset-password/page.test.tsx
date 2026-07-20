import { fireEvent, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { render } from "@/test-utils/render-with-tooltip";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ResetPasswordPage from "./page";

const messages = {
  Auth: {
    resetPassword: {
      linkExpiredTitle: "Reset Link Expired",
      linkExpiredBody:
        "This reset link is invalid or has expired. Please request a new one.",
      requestResetButton: "Request Password Reset",
      successTitle: "Password reset successful",
      successBody: "You can now sign in with your new password.",
      signInButton: "Sign in",
      submittingButton: "Resetting...",
      submitButton: "Reset Password",
      newPasswordLabel: "New password",
      confirmPasswordLabel: "Confirm new password",
      backToSignInButton: "Back to sign in",
      setNewPasswordTitle: "Set New Password",
      setNewPasswordSubtitle: "Choose a new password below",
      loadingFallback: "Loading password reset...",
    },
  },
};

function renderWithIntl(node: ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {node}
    </NextIntlClientProvider>,
  );
}

const mocks = vi.hoisted(() => ({
  searchParams: {
    get: vi.fn(),
  },
  router: {
    back: vi.fn(),
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  },
  apiPost: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useSearchParams: () => mocks.searchParams,
  useRouter: () => mocks.router,
}));

vi.mock("@/lib/api/api-client", () => ({
  api: {
    post: (...args: unknown[]) => mocks.apiPost(...args),
  },
}));

vi.mock("@/lib/monitoring/logger", () => ({
  logger: {
    error: (...args: unknown[]) => mocks.loggerError(...args),
  },
}));

vi.mock("@/features/auth/components/PreDashboardShell", () => ({
  PreDashboardShell: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));

describe("ResetPasswordPage", () => {
  beforeEach(() => {
    mocks.searchParams.get.mockReset();
    mocks.apiPost.mockReset();
    mocks.loggerError.mockReset();
    mocks.searchParams.get.mockImplementation((key: string) =>
      key === "token" ? "reset-token" : null,
    );
  });

  it("shows required messages for blank password fields", async () => {
    renderWithIntl(<ResetPasswordPage />);

    fireEvent.click(screen.getByRole("button", { name: "Reset Password" }));

    expect(await screen.findByText("Enter new password")).toBeInTheDocument();
    expect(screen.getByText("Confirm password")).toBeInTheDocument();
    expect(mocks.apiPost).not.toHaveBeenCalled();
  });
});
