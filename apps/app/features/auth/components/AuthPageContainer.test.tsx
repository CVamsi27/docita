import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthPageContainer } from "./AuthPageContainer";

const mocks = vi.hoisted(() => ({
  router: {
    push: vi.fn(),
    replace: vi.fn(),
  },
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

vi.mock("next/navigation", () => ({
  useRouter: () => mocks.router,
}));

vi.mock("@/lib/auth-context", () => ({
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

vi.mock("@/components/common/loaders/page-transition-loader", () => ({
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

vi.mock("@workspace/ui/components/theme-toggle", () => ({
  ThemeToggle: () => <button type="button">Toggle theme</button>,
}));

describe("AuthPageContainer", () => {
  beforeEach(() => {
    mocks.router.push.mockReset();
    mocks.router.replace.mockReset();
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

  it("shows a clear message when the email lookup fails", async () => {
    mocks.checkEmail.mockRejectedValue(new Error("network"));

    render(<AuthPageContainer />);

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "doctor@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(
        screen.getByText("We could not check this email right now. Please try again."),
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
    fireEvent.change(screen.getByLabelText(/^password$/i), {
      target: { value: "Password@123" },
    });
    fireEvent.change(screen.getByLabelText(/re-enter password/i), {
      target: { value: "Password@999" },
    });
    fireEvent.click(
      screen.getByRole("radio", { name: /yes, i'll also see patients/i }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Create Account" }));

    expect(await screen.findByText("Passwords do not match.")).toBeInTheDocument();
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
      expect(mocks.router.replace).toHaveBeenCalledWith("/verify-email-sent");
    });

    expect(screen.getByTestId("page-transition-loader")).toHaveTextContent(
      "Redirecting...",
    );
  });
});
