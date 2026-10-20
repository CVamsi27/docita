import { render, screen } from "@/test-utils";
import { within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PartnerMySubmissionsView } from "./PartnerMySubmissionsView";

const { myLeadsMock } = vi.hoisted(() => ({
  myLeadsMock: vi.fn(),
}));

vi.mock("@/features/referral-partner/hooks/use-partner-auth", () => ({
  usePartnerAuth: () => ({
    buildContext: () => ({
      accessToken: "tok_123",
      baseUrl: "https://api.test",
    }),
    signOut: vi.fn(),
  }),
}));

vi.mock("@workspace/data-access", () => ({
  usePartnerMyLeads: () => myLeadsMock(),
}));

const leadView = (overrides: Record<string, unknown> = {}) => ({
  id: "lead-1",
  referrerId: "r1",
  referrerName: "Alice Partner",
  status: "SUBMITTED",
  facilityName: "Sunrise Diagnostics",
  facilityType: "DIAGNOSTIC_CENTRE",
  address: "12 MG Road",
  city: "Bengaluru",
  state: "Karnataka",
  postalCode: "560001",
  contactName: "Dr Anil",
  contactPhone: "+919812345678",
  contactEmail: null,
  consentToFollowUp: true,
  createdAt: "2026-08-16T10:00:00Z",
  updatedAt: "2026-08-16T10:00:00Z",
  ...overrides,
});

describe("PartnerMySubmissionsView", () => {
  beforeEach(() => {
    myLeadsMock.mockReset();
  });

  it("renders each submission with facility, partner-visible status, and submitted date", () => {
    myLeadsMock.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        items: [
          leadView(),
          leadView({
            id: "lead-2",
            status: "DUPLICATE_REVIEW",
            facilityName: "Mumbai Harbour Diagnostics",
            city: "Mumbai",
            state: "Maharashtra",
            createdAt: "2026-08-10T10:00:00Z",
          }),
        ],
        nextCursor: null,
      },
    });
    render(<PartnerMySubmissionsView />);

    expect(screen.getByText("Sunrise Diagnostics")).toBeInTheDocument();
    expect(screen.getByText("Bengaluru, Karnataka")).toBeInTheDocument();
    expect(screen.getByText("2026-08-16")).toBeInTheDocument();
    const sunriseRow = screen.getByText("Sunrise Diagnostics").closest("tr");
    expect(sunriseRow).not.toBeNull();
    expect(within(sunriseRow as HTMLElement).getByText("Submitted")).toBeInTheDocument();

    expect(screen.getByText("Mumbai Harbour Diagnostics")).toBeInTheDocument();
    expect(screen.getByText("Mumbai, Maharashtra")).toBeInTheDocument();
    const mumbaiRow = screen.getByText("Mumbai Harbour Diagnostics").closest("tr");
    expect(mumbaiRow).not.toBeNull();
    expect(within(mumbaiRow as HTMLElement).getByText("Under review")).toBeInTheDocument();
  });

  it("maps the remaining states to partner-facing buckets", () => {
    myLeadsMock.mockReturnValue({
      isLoading: false,
      isError: false,
      data: {
        items: [
          leadView({ id: "l1", status: "TRIAGED" }),
          leadView({ id: "l2", status: "CONVERTED", facilityName: "Onboarded Clinic" }),
          leadView({ id: "l3", status: "LOST", facilityName: "Lost Clinic" }),
        ],
        nextCursor: null,
      },
    });
    render(<PartnerMySubmissionsView />);

    expect(screen.getByText("In progress")).toBeInTheDocument();
    expect(screen.getByText("Onboarded")).toBeInTheDocument();
    expect(screen.getByText("Closed")).toBeInTheDocument();
  });

  it("shows the empty state when the partner has no submissions", () => {
    myLeadsMock.mockReturnValue({
      isLoading: false,
      isError: false,
      data: { items: [], nextCursor: null },
    });
    render(<PartnerMySubmissionsView />);

    expect(screen.getByText(/No submissions yet/)).toBeInTheDocument();
  });

  it("shows the loading state while fetching", () => {
    myLeadsMock.mockReturnValue({ isLoading: true, isError: false, data: undefined });
    render(<PartnerMySubmissionsView />);
    expect(screen.getByText("Loading…")).toBeInTheDocument();
  });

  it("surfaces the error without crashing (status/code message preserved)", () => {
    myLeadsMock.mockReturnValue({
      isLoading: false,
      isError: true,
      error: new Error("Request failed with status code 401"),
      data: undefined,
    });
    render(<PartnerMySubmissionsView />);

    expect(screen.getByText("Couldn't load your submissions")).toBeInTheDocument();
    expect(
      screen.getByText("Request failed with status code 401"),
    ).toBeInTheDocument();
  });
});
