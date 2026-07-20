import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { queryKeys } from "@workspace/data-access";
import { beforeEach, describe, expect, it, vi } from "vitest";
import JoinRequestsPage from "./page";

// Minimal message namespace the components under test actually read.
const messages = {
  Settings: {
    joinRequestReview: {
      approveTitle: "Approve Join Request",
      approveDescription: "Approve {name} to join your facility",
      assignedRoleLabel: "Assigned Role",
      roleDoctor: "Doctor",
      roleNurse: "Nurse",
      roleAdmin: "Admin",
      roleReceptionist: "Receptionist",
      roleAdminDoctor: "Admin Doctor",
      roleDiffersHelper: "This differs from the requested role ({requested})",
      welcomeMessageLabel: "Welcome Message",
      optionalSuffix: "(optional)",
      welcomeMessagePlaceholder: "Enter welcome message",
      charCount: "{count}/500",
      cancelButton: "Cancel",
      approvingLabel: "Approving…",
      approveRequestButton: "Approve Request",
      rejectTitle: "Reject Join Request",
      rejectDescription: "Provide a reason for rejecting {name}'s request",
      rejectionReasonLabel: "Reason for Rejection",
      rejectionReasonPlaceholder: "Enter rejection reason",
      rejectionReasonHelper: "This reason will be sent to the applicant",
      rejectingLabel: "Rejecting…",
      rejectRequestButton: "Reject Request",
    },
  },
  Common: {
    cancel: "Cancel",
    save: "Save",
  },
};

function renderWithIntl(node: React.ReactNode) {
  return render(withIntl(node));
}

function withIntl(node: React.ReactNode) {
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      {node}
    </NextIntlClientProvider>
  );
}

const joinRequestMocks = vi.hoisted(() => ({
  query: {
    data: [] as unknown[],
    isLoading: false,
  },
  queryClient: {
    invalidateQueries: vi.fn(),
  },
  list: vi.fn(),
  approve: vi.fn(),
  reject: vi.fn(),
  toastSuccess: vi.fn(),
  showError: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => joinRequestMocks.query,
  useQueryClient: () => joinRequestMocks.queryClient,
  useMutation: (options: {
    mutationFn: (variables: unknown) => Promise<unknown>;
    onSuccess?: () => void;
    onError?: () => void;
  }) => ({
    isPending: false,
    mutate: async (variables: unknown) => {
      try {
        await options.mutationFn(variables);
        options.onSuccess?.();
      } catch {
        options.onError?.();
      }
    },
  }),
}));

vi.mock("@/lib/api/api-client", () => ({
  typedApi: {
    joinRequests: {
      list: joinRequestMocks.list,
      approve: joinRequestMocks.approve,
      reject: joinRequestMocks.reject,
    },
  },
}));

vi.mock("@/lib/errors/user-facing-errors", () => ({
  showUserFacingErrorToast: joinRequestMocks.showError,
}));

vi.mock("sonner", () => ({
  toast: {
    success: joinRequestMocks.toastSuccess,
  },
}));

// RoleGuard (added to gate the page) calls useRouter; provide a router stub.
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  usePathname: () => "/settings/team/join-requests",
  useSearchParams: () => new URLSearchParams(),
}));

// The page guards the panel with <RoleGuard requiredPermission="manageStaff">,
// so render as an admin who holds that permission (ADMIN_DOCTOR). Preserve the
// rest of the auth module so the @/components barrel still resolves.
vi.mock("@/lib/auth/auth-context", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/auth-context")>();
  return {
    ...actual,
    useAuth: () => ({
      user: { id: "admin_1", role: "ADMIN_DOCTOR" },
      isLoading: false,
      token: "test-token",
    }),
  };
});

const request = {
  id: "join_1",
  status: "PENDING",
  requestedRole: "DOCTOR",
  message: "I work with the cardiology team.",
  requestedAt: "2026-04-29T00:00:00.000Z",
  user: {
    id: "user_1",
    name: "Dr. Asha Rao",
    email: "asha@example.com",
    phoneNumber: "+919000000000",
  },
};

describe("JoinRequestsPage", () => {
  beforeEach(() => {
    joinRequestMocks.query = {
      data: [request],
      isLoading: false,
    };
    joinRequestMocks.queryClient.invalidateQueries.mockReset();
    joinRequestMocks.list.mockReset();
    joinRequestMocks.approve.mockReset().mockResolvedValue({});
    joinRequestMocks.reject.mockReset().mockResolvedValue({});
    joinRequestMocks.toastSuccess.mockReset();
    joinRequestMocks.showError.mockReset();
  });

  it("approves a pending team join request with an optional welcome message", async () => {
    renderWithIntl(<JoinRequestsPage />);

    expect(screen.getByText("Team Join Requests")).toBeInTheDocument();
    expect(screen.getByText("Dr. Asha Rao")).toBeInTheDocument();
    expect(screen.getByText("Requested: DOCTOR")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: /Approve/i })[0]!);
    fireEvent.change(screen.getByPlaceholderText("Enter welcome message"), {
      target: { value: "Welcome to Care Clinic." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Approve Request" }));

    await waitFor(() => {
      expect(joinRequestMocks.approve).toHaveBeenCalledWith("join_1", {
        assignedRole: undefined,
        welcomeMessage: "Welcome to Care Clinic.",
      });
    });
    expect(joinRequestMocks.queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.clinicJoinRequests.all(),
    });
    expect(joinRequestMocks.toastSuccess).toHaveBeenCalledWith(
      "Join request approved! User can now access the dashboard",
    );
  });

  it("rejects a team join request with a trimmed reason", async () => {
    renderWithIntl(<JoinRequestsPage />);

    fireEvent.click(screen.getAllByRole("button", { name: /Reject/i })[0]!);
    fireEvent.change(screen.getByPlaceholderText("Enter rejection reason"), {
      target: { value: "  Please contact the facility owner first.  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Reject Request" }));

    await waitFor(() => {
      expect(joinRequestMocks.reject).toHaveBeenCalledWith("join_1", {
        reason: "Please contact the facility owner first.",
      });
    });
    expect(joinRequestMocks.toastSuccess).toHaveBeenCalledWith(
      "Join request rejected",
    );
  });

  it("shows loading and empty states", () => {
    joinRequestMocks.query = {
      data: [],
      isLoading: true,
    };
    const { rerender } = renderWithIntl(<JoinRequestsPage />);
    expect(screen.getByText("Loading join requests…")).toBeInTheDocument();

    joinRequestMocks.query = {
      data: [],
      isLoading: false,
    };
    rerender(withIntl(<JoinRequestsPage />));
    expect(screen.getByText("No Pending Requests")).toBeInTheDocument();
  });
});
