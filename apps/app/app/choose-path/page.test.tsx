import { render, screen, waitFor } from "@testing-library/react";
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
    };
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

    render(<ChoosePathPage />);

    await waitFor(() => {
      expect(mocks.router.replace).toHaveBeenCalledWith("/join-request-status");
    });

    expect(screen.getByTestId("page-transition-loader")).toHaveTextContent(
      "Redirecting...",
    );
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
