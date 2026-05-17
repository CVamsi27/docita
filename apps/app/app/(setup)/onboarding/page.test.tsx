import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OnboardingPage from "./page";

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
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => mocks.router,
}));

vi.mock("next/dynamic", () => ({
  default: () => function DynamicStub() {
    return <div data-testid="clinic-onboarding-wizard" />;
  },
}));

vi.mock("@/lib/auth/auth-context", () => ({
  useAuth: () => mocks.auth,
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

vi.mock("@/features/auth/components/PreDashboardShell", () => ({
  PreDashboardShell: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pre-dashboard-shell">{children}</div>
  ),
}));

describe("OnboardingPage", () => {
  beforeEach(() => {
    mocks.router.push.mockReset();
    mocks.router.replace.mockReset();
    mocks.auth = {
      user: null,
      isAuthenticated: false,
      isLoading: false,
    };
  });

  it("redirects unauthenticated visitors to login", async () => {
    render(<OnboardingPage />);

    await waitFor(() => {
      expect(mocks.router.replace).toHaveBeenCalledWith("/login?next=/onboarding");
    });

    expect(screen.getByTestId("page-transition-loader")).toHaveTextContent(
      "Redirecting…",
    );
  });

  it("redirects completed onboarding users to their workspace", async () => {
    mocks.auth = {
      user: {
        id: "user-1",
        clinicId: "clinic-1",
        onboardingStep: "COMPLETED",
      },
      isAuthenticated: true,
      isLoading: false,
    };

    render(<OnboardingPage />);

    await waitFor(() => {
      expect(mocks.router.replace).toHaveBeenCalledWith("/today");
    });

    expect(screen.getByTestId("page-transition-loader")).toHaveTextContent(
      "Redirecting…",
    );
  });

  it("redirects join-request users to request status", async () => {
    mocks.auth = {
      user: {
        id: "user-1",
        clinicId: null,
        onboardingStep: "JOINING_CLINIC",
      },
      isAuthenticated: true,
      isLoading: false,
    };

    render(<OnboardingPage />);

    await waitFor(() => {
      expect(mocks.router.replace).toHaveBeenCalledWith("/join-request-status");
    });

    expect(screen.getByTestId("page-transition-loader")).toHaveTextContent(
      "Redirecting…",
    );
  });

  it("redirects users who have not chosen a path yet back to choose-path", async () => {
    mocks.auth = {
      user: {
        id: "user-1",
        clinicId: null,
        onboardingStep: "NOT_STARTED",
      },
      isAuthenticated: true,
      isLoading: false,
    };

    render(<OnboardingPage />);

    await waitFor(() => {
      expect(mocks.router.replace).toHaveBeenCalledWith("/choose-path");
    });

    expect(screen.getByTestId("page-transition-loader")).toHaveTextContent(
      "Redirecting…",
    );
  });
});
