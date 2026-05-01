import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import VerifyEmailPage from "./page";

const mocks = vi.hoisted(() => ({
  router: {
    push: vi.fn(),
    replace: vi.fn(),
  },
  searchParams: new URLSearchParams("token=verify-token"),
  refreshUser: vi.fn(),
  user: {
    id: "user-1",
    name: "Dr. User",
    email: "doctor@example.com",
    role: "ADMIN_DOCTOR",
    clinicId: null,
    onboardingStep: "CHOOSE_PATH",
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => mocks.router,
  useSearchParams: () => mocks.searchParams,
}));

vi.mock("@/features/auth/components/AuthBrandingPanel", () => ({
  AuthBrandingPanel: () => <div data-testid="auth-branding-panel" />,
}));

vi.mock("@workspace/ui/components/theme-toggle", () => ({
  ThemeToggle: () => <button type="button">Toggle theme</button>,
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    user: mocks.user,
    refreshUser: mocks.refreshUser,
  }),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe("VerifyEmailPage", () => {
  beforeEach(() => {
    mocks.router.push.mockReset();
    mocks.router.replace.mockReset();
    mocks.refreshUser.mockReset();
    mocks.searchParams = new URLSearchParams("token=verify-token");
    mocks.user = {
      id: "user-1",
      name: "Dr. User",
      email: "doctor@example.com",
      role: "ADMIN_DOCTOR",
      clinicId: null,
      onboardingStep: "CHOOSE_PATH",
    };
    mocks.refreshUser.mockResolvedValue(mocks.user);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("{}", { status: 200 })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows verified state and lets the user continue after verification succeeds", async () => {
    render(<VerifyEmailPage />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("auth/verify-email"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ token: "verify-token" }),
        }),
      );
    });

    await waitFor(() => {
      expect(mocks.refreshUser).toHaveBeenCalledTimes(1);
    });

    expect(
      screen.getByText(/verified/i),
    ).toBeInTheDocument();
    expect(mocks.router.replace).toHaveBeenCalledWith("/verify-email/verified");
  });

  it("still shows verified state when refreshing the user after verification fails", async () => {
    mocks.refreshUser.mockRejectedValueOnce(new Error("refresh failed"));

    render(<VerifyEmailPage />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining("auth/verify-email"),
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ token: "verify-token" }),
        }),
      );
    });

    expect(await screen.findByText(/verified/i)).toBeInTheDocument();
    expect(
      screen.queryByText(/verification failed/i),
    ).not.toBeInTheDocument();
    expect(mocks.router.replace).toHaveBeenCalledWith("/verify-email/verified");
  });

  it("does not call verification when the token is missing", () => {
    mocks.searchParams = new URLSearchParams();

    render(<VerifyEmailPage />);

    expect(fetch).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        "No verification link was found. Please use the link from your email.",
      ),
    ).toBeInTheDocument();
  });
});
