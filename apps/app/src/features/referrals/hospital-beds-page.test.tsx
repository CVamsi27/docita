import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@/test-utils";
import { HospitalBedsPage } from "@/features/referrals/pages/referrals-page";
import type { HospitalBed } from "@/features/referrals/api/referrals.api";

/**
 * `useQuery` is stubbed rather than wrapped in a QueryClientProvider: this page
 * has one query and the assertion under test is the rendered label, not the
 * fetching behaviour (which `hospital-beds.test.ts` covers at the API layer).
 */
const useQueryMock = vi.fn();
vi.mock("@tanstack/react-query", () => ({ useQuery: () => useQueryMock() }));

const beds: HospitalBed[] = [
  { id: "b1", ward: "ICU", roomNumber: "101", bedNumber: "1A", status: "OCCUPIED" },
  { id: "b2", ward: "ICU", roomNumber: "101", bedNumber: "1B", status: "AVAILABLE" },
];

const settle = (data: HospitalBed[]) => {
  useQueryMock.mockReturnValue({
    data,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  });
};

describe("HospitalBedsPage", () => {
  beforeEach(() => useQueryMock.mockReset());

  it("renders translated bed status copy, never the raw wire token", () => {
    settle(beds);
    render(<HospitalBedsPage />);

    expect(screen.getByText("Available")).toBeInTheDocument();
    expect(screen.getByText("Occupied")).toBeInTheDocument();

    // The regression this guards: the grid rendered `bed.status` verbatim, so a
    // clinician saw "OCCUPIED" instead of "Occupied".
    expect(screen.queryByText("OCCUPIED")).not.toBeInTheDocument();
    expect(screen.queryByText("AVAILABLE")).not.toBeInTheDocument();
  });

  it("shows the bed number and ward context", () => {
    settle(beds);
    render(<HospitalBedsPage />);

    expect(screen.getByText("1A")).toBeInTheDocument();
    expect(screen.getByText("1B")).toBeInTheDocument();
    // One "ICU • 101" line per bed, so two beds means two matches.
    expect(screen.getAllByText(/ICU/)).toHaveLength(2);
  });

  it("shows the empty state when there are no beds", () => {
    settle([]);
    render(<HospitalBedsPage />);
    expect(screen.getByText(/No beds configured/)).toBeInTheDocument();
  });
});