import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ChoosePathPage from "./page";

const mocks = vi.hoisted(() => ({
  router: {
    push: vi.fn(),
    replace: vi.fn(),
  },
  auth: {
    user: null as {
      id: string;
      clinicId: string | null;
      onboardingStep?: string | null;
    } | null,
    isAuthenticated: false,
    isLoading: false,
    refreshUser: vi.fn(),
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => mocks.router,
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => mocks.auth,
}));

vi.mock("@/lib/api-client", () => ({
  typedApi: {
    onboarding: {
      choosePath: vi.fn(),
    },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
  },
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

vi.mock("@/components/common/support-contact", () => ({
  SupportContact: () => <div data-testid="support-contact" />,
}));

vi.mock("@/features/auth/components/PreDashboardShell", () => ({
  PreDashboardShell: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pre-dashboard-shell">{children}</div>
  ),
}));

describe("ChoosePathPage", () => {
  beforeEach(() => {
    mocks.router.push.mockReset();
    mocks.router.replace.mockReset();
    mocks.auth = {
      user: null,
      isAuthenticated: false,
      isLoading: false,
      refreshUser: vi.fn(),
    };
  });

  it("refreshes auth and navigates to onboarding after choosing create clinic", async () => {
    mocks.auth = {
      user: {
        id: "user-1",
        clinicId: null,
        onboardingStep: "CHOOSE_PATH",
      },
      isAuthenticated: true,
      isLoading: false,
      refreshUser: vi.fn().mockResolvedValue({
        id: "user-1",
        clinicId: null,
        onboardingStep: "CREATING_CLINIC",
      }),
    };

    const { typedApi } = await import("@/lib/api-client");
    vi.mocked(typedApi.onboarding.choosePath).mockResolvedValue({
      success: true,
    });

    render(<ChoosePathPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /get started/i })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: /get started/i }));

    await waitFor(() => {
      expect(typedApi.onboarding.choosePath).toHaveBeenCalledWith(
        "CREATE_CLINIC",
      );
    });

    await waitFor(() => {
      expect(mocks.auth.refreshUser).toHaveBeenCalledTimes(1);
      expect(mocks.router.push).toHaveBeenCalledWith("/onboarding");
    });
  });

  it("keeps join-request users on the choose-path page", async () => {
    mocks.auth = {
      user: {
        id: "user-1",
        clinicId: null,
        onboardingStep: "JOINING_CLINIC",
      },
      isAuthenticated: true,
      isLoading: false,
      refreshUser: vi.fn(),
    };

    render(<ChoosePathPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /get started/i })).toBeEnabled();
      expect(screen.getByRole("button", { name: /search clinics/i })).toBeEnabled();
    });

    expect(mocks.router.replace).not.toHaveBeenCalled();
  });

  it("redirects clinic creators back to onboarding", async () => {
    mocks.auth = {
      user: {
        id: "user-1",
        clinicId: null,
        onboardingStep: "CREATING_CLINIC",
      },
      isAuthenticated: true,
      isLoading: false,
      refreshUser: vi.fn(),
    };

    render(<ChoosePathPage />);

    await waitFor(() => {
      expect(mocks.router.replace).toHaveBeenCalledWith("/onboarding");
    });

    expect(screen.getByTestId("page-transition-loader")).toHaveTextContent(
      "Redirecting...",
    );
  });
});
