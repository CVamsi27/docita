import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PreDashboardShell } from "./PreDashboardShell";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  logout: vi.fn(),
  user: null as
    | null
    | {
        emailVerified?: boolean;
      },
}));

vi.mock("react-router", () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock("@/lib/auth/auth-context", () => ({
  useAuth: () => ({
    logout: mocks.logout,
    user: mocks.user,
  }),
}));

vi.mock("./AuthBrandingPanel", () => ({
  AuthBrandingPanel: () => <div data-testid="branding-panel" />,
}));

vi.mock("@/components/support-contact/support-contact", () => ({
  SupportContact: () => <div data-testid="support-contact-footer" />,
}));

vi.mock("@/components/layout/theme-toggle-with-appearance-sync", () => ({
  ThemeToggleWithAppearanceSync: () => <button type="button">Theme</button>,
}));

vi.mock("@/components/i18n/locale-switcher", () => ({
  LocaleSwitcher: () => <span>Locale</span>,
}));

vi.mock("@workspace/ui/components/indicators/docita-logo", () => ({
  DocitaLogo: () => <div data-testid="docita-logo" />,
}));

describe("PreDashboardShell", () => {
  beforeEach(() => {
    mocks.navigate.mockReset();
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
      expect(mocks.navigate).toHaveBeenCalledWith("/verify-email-sent", {
        replace: true,
      });
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
      expect(mocks.navigate).not.toHaveBeenCalled();
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

  it("renders the auth pre-dashboard footer", () => {
    render(
      <PreDashboardShell currentStep="choose-path">
        <div>Choose path</div>
      </PreDashboardShell>,
    );

    expect(screen.getByTestId("auth-pre-dashboard-footer")).toBeInTheDocument();
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
