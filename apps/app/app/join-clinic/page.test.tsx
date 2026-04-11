import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import JoinClinicPage from "./page";

const mocks = vi.hoisted(() => ({
  router: {
    replace: vi.fn(),
    push: vi.fn(),
  },
  auth: {
    user: {
      id: "user-1",
      email: "owner@example.com",
      clinicId: null,
      onboardingStep: "JOINING_CLINIC",
    },
    isAuthenticated: true,
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
    clinics: {
      searchForJoin: vi.fn(),
    },
    joinRequests: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/components/common/loaders/page-transition-loader", () => ({
  PageTransitionLoader: ({
    title,
    description,
  }: {
    title: string;
    description?: string;
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

vi.mock("@/lib/logger", () => ({
  logger: {
    error: vi.fn(),
  },
}));

vi.mock("@/lib/user-facing-errors", () => ({
  showUserFacingErrorToast: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
  },
}));

describe("JoinClinicPage", () => {
  beforeEach(() => {
    mocks.router.replace.mockReset();
    mocks.router.push.mockReset();
    mocks.auth = {
      user: {
        id: "user-1",
        email: "owner@example.com",
        clinicId: null,
        onboardingStep: "JOINING_CLINIC",
      },
      isAuthenticated: true,
      isLoading: false,
    };
  });

  it("redirects users with a pending join request to the request status page", async () => {
    render(<JoinClinicPage />);

    await waitFor(() => {
      expect(mocks.router.replace).toHaveBeenCalledWith("/join-request-status");
    });
  });
});
