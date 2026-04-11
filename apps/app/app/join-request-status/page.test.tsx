import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import JoinRequestStatusPage from "./page";

const mocks = vi.hoisted(() => ({
  router: {
    replace: vi.fn(),
    push: vi.fn(),
  },
  refreshUser: vi.fn(),
  query: {
    data: null as unknown,
    isLoading: false,
  },
  queryClient: {
    invalidateQueries: vi.fn(),
  },
  mutation: {
    mutate: vi.fn(),
    isPending: false,
  },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => mocks.router,
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => mocks.query,
  useMutation: () => mocks.mutation,
  useQueryClient: () => mocks.queryClient,
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      clinicId: "clinic-1",
      onboardingStep: "COMPLETED",
    },
    refreshUser: mocks.refreshUser,
  }),
}));

vi.mock("@/lib/api-client", () => ({
  typedApi: {
    joinRequests: {
      getMine: vi.fn(),
      withdraw: vi.fn(),
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

vi.mock("@/lib/user-facing-errors", () => ({
  showUserFacingErrorToast: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
  },
}));

vi.mock("@/components/common/support-contact", () => ({
  SupportContact: () => <div data-testid="support-contact" />,
}));

describe("JoinRequestStatusPage", () => {
  beforeEach(() => {
    mocks.router.replace.mockReset();
    mocks.router.push.mockReset();
    mocks.refreshUser.mockReset();
    mocks.query.invalidateQueries?.mockReset?.();
    mocks.mutation.mutate.mockReset();
    mocks.query = {
      data: null,
      isLoading: false,
    };
    mocks.mutation = {
      mutate: vi.fn(),
      isPending: false,
    };
  });

  it("redirects linked users to the dashboard when no active request exists", async () => {
    render(<JoinRequestStatusPage />);

    await waitFor(() => {
      expect(mocks.router.replace).toHaveBeenCalledWith("/dashboard");
    });
  });
});
