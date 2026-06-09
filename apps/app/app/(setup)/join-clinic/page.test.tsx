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
  shellProps: {
    currentStep: "",
    contentMaxWidth: "",
    contentAlignment: "",
    showSignOut: false,
  } as {
    currentStep: string;
    contentMaxWidth?: string;
    contentAlignment?: string;
    showSignOut?: boolean;
  },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => mocks.router,
}));

vi.mock("@/lib/auth/auth-context", () => ({
  useAuth: () => mocks.auth,
}));

vi.mock("@/lib/api/api-client", () => ({
  typedApi: {
    clinics: {
      searchForJoin: vi.fn(),
    },
    joinRequests: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/components/loaders/page-transition-loader", () => ({
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
  PreDashboardShell: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    currentStep: string;
    contentMaxWidth?: string;
    contentAlignment?: string;
    showSignOut?: boolean;
  }) => {
    mocks.shellProps = props;
    return <div data-testid="pre-dashboard-shell">{children}</div>;
  },
}));

vi.mock("@/lib/monitoring/logger", () => ({
  logger: {
    error: vi.fn(),
  },
}));

vi.mock("@/lib/errors/user-facing-errors", () => ({
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
    mocks.shellProps = {
      currentStep: "",
      contentMaxWidth: "",
      contentAlignment: "",
      showSignOut: false,
    };
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

  it("requests top-aligned content in the pre-dashboard shell", () => {
    render(<JoinClinicPage />);

    expect(mocks.shellProps.contentAlignment).toBe("start");
    expect(mocks.shellProps.contentMaxWidth).toBe("max-w-2xl");
    expect(mocks.shellProps.currentStep).toBe("join-clinic");
  });
});
