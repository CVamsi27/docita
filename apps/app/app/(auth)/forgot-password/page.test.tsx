import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import ForgotPasswordPage from "./page";

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
}));

const messages = {
  Auth: {
    forgotPassword: {
      title: "Reset Password",
      subtitle: "Enter your email address to receive a password reset link",
      submittedTitle: "Check your email",
      submittedBody:
        "If an account with that email exists, a password reset link has been sent",
      backToSignIn: "Back to sign in",
      emailLabel: "Email address",
      emailPlaceholder: "Enter email address",
      submitIdle: "Send reset link",
      submitPending: "Sending…",
    },
  },
};

function renderWithIntl(ui: ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useSearchParams: () => mocks.searchParams,
  useRouter: () => mocks.router,
}));

vi.mock("@/lib/api/api-client", () => ({
  api: {
    post: vi.fn(),
  },
}));

vi.mock("@/lib/monitoring/logger", () => ({
  logger: {
    error: vi.fn(),
  },
}));

vi.mock("@/features/auth/components/PreDashboardShell", () => ({
  PreDashboardShell: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));

describe("ForgotPasswordPage", () => {
  beforeEach(() => {
    mocks.searchParams.get.mockReset();
  });

  it("prefills the email input from the query string", () => {
    mocks.searchParams.get.mockReturnValue("typed@example.com");

    renderWithIntl(<ForgotPasswordPage />);

    expect(screen.getByLabelText(/email address/i)).toHaveValue(
      "typed@example.com",
    );
  });
});
