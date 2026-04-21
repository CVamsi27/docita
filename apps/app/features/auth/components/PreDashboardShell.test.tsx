import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PreDashboardShell } from "./PreDashboardShell";

const mocks = vi.hoisted(() => ({
  router: {
    replace: vi.fn(),
  },
  logout: vi.fn(),
  user: null as
    | null
    | {
        emailVerified?: boolean;
      },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => mocks.router,
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    logout: mocks.logout,
    user: mocks.user,
  }),
}));

vi.mock("./AuthBrandingPanel", () => ({
  AuthBrandingPanel: () => <div data-testid="branding-panel" />,
}));

vi.mock("@workspace/ui/components/theme-toggle", () => ({
  ThemeToggle: () => <button type="button">Theme</button>,
}));

vi.mock("@workspace/ui/components/docita-logo", () => ({
  DocitaLogo: () => <div data-testid="docita-logo" />,
}));

describe("PreDashboardShell", () => {
  beforeEach(() => {
    mocks.router.replace.mockReset();
    mocks.logout.mockReset();
    mocks.user = null;
  });

  it("redirects unverified users away from choose-path", async () => {
    mocks.user = { emailVerified: false };

    render(
      <PreDashboardShell currentStep="choose-path">
        <div>Choose path</div>
      </PreDashboardShell>,
    );

    await waitFor(() => {
      expect(mocks.router.replace).toHaveBeenCalledWith("/verify-email-sent");
    });
  });

  it("does not redirect while already on verify-email-sent", async () => {
    mocks.user = { emailVerified: false };

    render(
      <PreDashboardShell currentStep="verify-email-sent">
        <div>Verify email</div>
      </PreDashboardShell>,
    );

    await waitFor(() => {
      expect(mocks.router.replace).not.toHaveBeenCalled();
    });
  });

  it("omits the branding panel when showBrandingPanel is false", () => {
    const { container } = render(
      <PreDashboardShell currentStep="email" showBrandingPanel={false}>
        <div>Email step</div>
      </PreDashboardShell>,
    );

    expect(container.querySelector('[data-testid="branding-panel"]')).toBeNull();
  });

  it("renders the branding panel by default", () => {
    const { container } = render(
      <PreDashboardShell currentStep="choose-path">
        <div>Choose path</div>
      </PreDashboardShell>,
    );

    expect(
      container.querySelector('[data-testid="branding-panel"]'),
    ).not.toBeNull();
  });

  it("can hide the progress indicator", () => {
    render(
      <PreDashboardShell currentStep="email" showProgress={false}>
        <div>Email step</div>
      </PreDashboardShell>,
    );

    expect(screen.queryByText("Account setup")).not.toBeInTheDocument();
    expect(screen.queryByText("1 / 4")).not.toBeInTheDocument();
  });
});
