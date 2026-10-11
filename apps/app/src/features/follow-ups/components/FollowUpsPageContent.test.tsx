import { beforeEach, describe, expect, it, vi } from "vitest";
import { followUpResponseSchema } from "@workspace/types";
import { render, screen } from "@/test-utils";
import { SUBSCRIPTION_SETTINGS_PATH } from "@/lib/subscription/subscription-settings-path";
import { FollowUpsPageContent } from "./FollowUpsPageContent";

const fixture = vi.hoisted(() => ({
  canAccess: vi.fn(() => true),
  loading: true,
}));
const followUp = followUpResponseSchema.parse({
  id: "follow-up-fixture",
  appointmentId: "appointment-fixture",
  patientId: "patient-fixture",
  doctorId: "doctor-fixture",
  clinicId: "clinic-fixture",
  scheduledDate: "2026-10-11T10:00:00Z",
  reason: "Fixture callback reason",
  status: "PENDING",
  createdAt: "2026-10-10T10:00:00Z",
  updatedAt: "2026-10-10T10:00:00Z",
});
vi.mock("@/lib/stores/permission-store", () => ({
  usePermissionStore: () => fixture,
}));

vi.mock("@workspace/data-access", () => ({
  useFollowUps: () => ({
    data: fixture.loading ? [] : [followUp],
    isLoading: fixture.loading,
    isError: false,
    refetch: vi.fn(),
  }),
  useCompleteFollowUp: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useCancelFollowUp: () => ({ isPending: false, mutateAsync: vi.fn() }),
}));

describe("FollowUpsPageContent feature access", () => {
  beforeEach(() => {
    fixture.canAccess.mockReturnValue(true);
    fixture.loading = true;
  });

  it("preserves a denied heading and upgrade link without worklist records or actions", () => {
    fixture.canAccess.mockReturnValue(false);
    fixture.loading = false;
    render(<FollowUpsPageContent />);

    expect(
      screen.getByRole("heading", { name: "Follow-ups", level: 1 }),
    ).toBeVisible();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("link", { name: /Upgrade to/ })).toHaveAttribute(
      "href",
      SUBSCRIPTION_SETTINGS_PATH,
    );
    expect(
      screen.queryByRole("link", { name: "Appointments" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("tablist", { name: /view/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Fixture callback reason"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Complete" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Cancel" }),
    ).not.toBeInTheDocument();
  });

  it("preserves the allowed heading, worklist records and actions", () => {
    fixture.loading = false;
    render(<FollowUpsPageContent />);

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(
      screen.getByRole("heading", { name: "Follow-ups", level: 1 }),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "Appointments" })).toHaveAttribute(
      "href",
      "/appointments",
    );
    expect(screen.getByText("Fixture callback reason")).toBeVisible();
    expect(screen.getByRole("button", { name: "Complete" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeVisible();
    expect(
      screen.queryByRole("link", { name: /Upgrade to/ }),
    ).not.toBeInTheDocument();
  });
  it("renders the page title and the loading DataState", () => {
    render(<FollowUpsPageContent />);
    expect(
      screen.getByRole("heading", { name: "Follow-ups" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Loading follow-ups...")).toBeInTheDocument();
  });

  it("exposes the worklist as the panel for its view selector", () => {
    render(<FollowUpsPageContent />);

    expect(screen.getByRole("tablist", { name: /view/i })).toBeInTheDocument();
    expect(screen.getByRole("tabpanel", { name: "Today" })).toBeInTheDocument();
  });
});
