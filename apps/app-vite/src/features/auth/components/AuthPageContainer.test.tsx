import type { ReactElement } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthPageContainer } from "./AuthPageContainer";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return { ...actual, useNavigate: () => mocks.navigate };
});

vi.mock("@workspace/ui/components/overlay/tooltip", () => ({
  SymbolTooltip: ({ children }: { children: ReactElement }) => children,
}));

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  checkEmail: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  user: null as {
    id: string;
    clinicId?: string | null;
    emailVerified?: boolean;
    onboardingStep?: string | null;
  } | null,
  isAuthenticated: false,
}));

vi.mock("@/lib/auth/auth-context", () => ({
  useAuth: () => ({
    user: mocks.user,
    isAuthenticated: mocks.isAuthenticated,
    login: mocks.login,
    register: mocks.register,
    checkEmail: mocks.checkEmail,
    isLoginLocked: false,
    loginLockoutUntil: null,
  }),
}));

vi.mock("./AuthBrandingPanel", () => ({
  AuthBrandingPanel: () => <div data-testid="auth-branding-panel" />,
}));

vi.mock("@/components/loaders/page-transition-loader", () => ({
  PageTransitionLoader: ({
    title,
    description,
  }: {
    title: string;
    description: string;
  }) => (
    <div data-testid="page-transition-loader">
      <div>{title}</div>
      <div>{description}</div>
    </div>
  ),
}));

vi.mock("@/components/layout/theme-toggle-with-appearance-sync", () => ({
  ThemeToggleWithAppearanceSync: () => <button type="button">Toggle theme</button>,
}));

vi.mock("@/components/i18n/locale-switcher", () => ({
  LocaleSwitcher: () => <span>Locale</span>,
}));

vi.mock("@workspace/ui/components/indicators/docita-logo", () => ({
  DocitaLogo: () => <div data-testid="docita-logo" />,
  // DocitaLoadingIndicator renders DocitaIcon internally; keep the mock complete.
  DocitaIcon: () => null,
}));

describe("AuthPageContainer", () => {
  beforeEach(() => {
    mocks.navigate.mockReset();
    mocks.checkEmail.mockReset();
    mocks.login.mockReset();
    mocks.register.mockReset();
    mocks.user = null;
    mocks.isAuthenticated = false;
  });

  it("shows a field error for an invalid email before checking the account", async () => {
    render(<AuthPageContainer />);

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "not-an-email" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(
      await screen.findByText("Please enter a valid email address"),
    ).toBeInTheDocument();
    expect(mocks.checkEmail).not.toHaveBeenCalled();
  });

  it("keeps the branding panel visible on the email step and after continue", async () => {
    mocks.checkEmail.mockResolvedValue(false);

    render(<AuthPageContainer />);

    expect(screen.getByTestId("auth-branding-panel")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "new@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(
      await screen.findByText("Create your account"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("auth-branding-panel")).toBeInTheDocument();
  });

  it("shows a clear message when the email lookup fails", async () => {
    mocks.checkEmail.mockRejectedValue(new Error("network"));

    render(<AuthPageContainer />);

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "doctor@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(
        screen.getByText((content) =>
          content.includes("We could not check this email right now"),
        ),
      ).toBeInTheDocument();
    });
  });

  it("blocks signup when the confirmation password does not match", async () => {
    mocks.checkEmail.mockResolvedValue(false);

    render(<AuthPageContainer />);

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "owner@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByText("Create your account")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/first name/i), {
      target: { value: "Jane" },
    });
    fireEvent.change(screen.getByLabelText(/last name/i), {
      target: { value: "Doe" },
    });
    fireEvent.change(screen.getByLabelText(/^password/i), {
      target: { value: "Password@123" },
    });
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: "Password@999" },
    });
    fireEvent.click(
      screen.getByRole("radio", { name: /yes, i'll also see patients/i }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

    expect(await screen.findByText("Passwords do not match")).toBeInTheDocument();
    expect(mocks.register).not.toHaveBeenCalled();
  });

  it("shows required signup password messages when both password fields are blank", async () => {
    mocks.checkEmail.mockResolvedValue(false);

    render(<AuthPageContainer />);

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "owner@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(await screen.findByText("Create your account")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/first name/i), {
      target: { value: "Jane" },
    });
    fireEvent.change(screen.getByLabelText(/last name/i), {
      target: { value: "Doe" },
    });
    fireEvent.click(
      screen.getByRole("radio", { name: /yes, i'll also see patients/i }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

    expect(await screen.findByText("Enter password")).toBeInTheDocument();
    expect(
      screen.getByText("Confirm password"),
    ).toBeInTheDocument();
    expect(mocks.register).not.toHaveBeenCalled();
  });

  it("redirects already authenticated users to the next step", async () => {
    mocks.user = {
      id: "user-1",
      clinicId: null,
      emailVerified: false,
      onboardingStep: "CHOOSE_PATH",
    };
    mocks.isAuthenticated = true;

    render(<AuthPageContainer />);

    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith("/verify-email-sent", {
        replace: true,
      });
    });

    expect(screen.getByTestId("page-transition-loader")).toHaveTextContent(
      "Redirecting…",
    );
  });
});
