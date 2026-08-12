import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@/test-utils";
import { FollowUpsPageContent } from "./FollowUpsPageContent";

// P2.1 T-density smoke: prove the page renders through FeatureGate into its
// DataState surface. The data-access hooks are mocked to return the loading
// state so the assertion targets the loading shell (per the plan's
// "DataState loading/error/empty where relevant" intent). List rendering is
// covered under the feature-test-density backlog.
vi.mock("@/lib/stores/permission-store", () => ({
  usePermissionStore: (selector?: (s: Record<string, unknown>) => unknown) => {
    const store = {
      canAccess: vi.fn().mockReturnValue(true),
      isFeatureLocked: vi.fn().mockReturnValue(false),
    };
    return selector
      ? selector(store as unknown as Record<string, unknown>)
      : store;
  },
}));

vi.mock("@workspace/data-access", () => ({
  useFollowUps: () => ({ data: [], isLoading: true, isError: false, refetch: vi.fn() }),
  useCompleteFollowUp: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useCancelFollowUp: () => ({ isPending: false, mutateAsync: vi.fn() }),
}));

describe("FollowUpsPageContent (smoke)", () => {
  it("renders the page title and the loading DataState", () => {
    render(<FollowUpsPageContent />);
    expect(
      screen.getByRole("heading", { name: "Follow-ups" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Loading follow-ups...")).toBeInTheDocument();
  });
});
