import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import JoinRequestStatusPage from "./page";

const mocks = vi.hoisted(() => ({
  router: {
    replace: vi.fn(),
    push: vi.fn(),
  },
  refreshUser: vi.fn(),
  queryOptions: null as {
    queryKey?: unknown;
    retry?: boolean;
    refetchInterval?: number | false;
  } | null,
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
    onSuccess: undefined as undefined | (() => void),
  },
  user: {
    id: "user-1",
    clinicId: "clinic-1",
    onboardingStep: "COMPLETED" as string | null | undefined,
  },
}));

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => mocks.router,
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: (options: {
    queryKey?: unknown;
    retry?: boolean;
    refetchInterval?: number | false;
  }) => {
    mocks.queryOptions = options;
    return mocks.query;
  },
  useMutation: (options: { onSuccess?: () => void }) => {
    mocks.mutation.onSuccess = options.onSuccess;
    return mocks.mutation;
  },
  useQueryClient: () => mocks.queryClient,
}));

vi.mock("@/lib/auth/auth-context", () => ({
  useAuth: () => ({
    user: mocks.user,
    refreshUser: mocks.refreshUser,
  }),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/lib/api/api-client", () => ({
  typedApi: {
    joinRequests: {
      getMine: vi.fn(),
      withdraw: vi.fn(),
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
  PreDashboardShell: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pre-dashboard-shell">{children}</div>
  ),
}));

vi.mock("@/lib/errors/user-facing-errors", () => ({
  showUserFacingErrorToast: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
  },
}));

describe("JoinRequestStatusPage", () => {
  beforeEach(() => {
    mocks.router.replace.mockReset();
    mocks.router.push.mockReset();
    mocks.refreshUser.mockReset();
    mocks.queryOptions = null;
    mocks.queryClient.invalidateQueries.mockReset();
    mocks.user = {
      id: "user-1",
      clinicId: "clinic-1",
      onboardingStep: "COMPLETED",
    };
    mocks.query = {
      data: null,
      isLoading: false,
    };
    mocks.mutation = {
      mutate: vi.fn(),
      isPending: false,
      onSuccess: undefined,
    };
  });

  it("redirects completed users to their workspace", async () => {
    render(<JoinRequestStatusPage />);

    await waitFor(() => {
      expect(mocks.router.replace).toHaveBeenCalledWith("/today");
    });
  });

  it("disables retries for the join request fetch", async () => {
    render(<JoinRequestStatusPage />);

    expect(mocks.queryOptions?.retry).toBe(false);
    expect(mocks.queryOptions?.refetchInterval).toBe(10000);
  });

  it("shows the rejected terminal state with reason and recovery CTAs instead of redirecting", async () => {
    mocks.user = {
      id: "user-1",
      clinicId: undefined,
      onboardingStep: undefined,
    };
    mocks.query = {
      data: {
        id: "req-1",
        status: "REJECTED",
        requestedRole: "DOCTOR",
        message: "I'm interested",
        rejectionReason: "Doctor pool is full this quarter.",
        requestedAt: new Date().toISOString(),
        clinic: { id: "c-1", name: "Sunrise Clinic" },
      },
      isLoading: false,
    };

    render(<JoinRequestStatusPage />);

    await waitFor(() => {
      expect(
        screen.getByTestId("join-request-terminal-rejected"),
      ).toBeInTheDocument();
    });
    expect(mocks.router.replace).not.toHaveBeenCalledWith("/choose-path");
    expect(screen.getByText(/Doctor pool is full this quarter\./)).toBeInTheDocument();
    expect(
      screen.getByTestId("join-request-try-different-clinic"),
    ).toHaveAttribute("href", "/join-clinic");
    expect(
      screen.getByTestId("join-request-create-clinic"),
    ).toHaveAttribute("href", "/choose-path");
  });
});
