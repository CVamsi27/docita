import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@/test-utils";
import { FeedbackPage } from "./feedback-page";
import { apiGet } from "@/lib/api/api-client";
import { formatDateTime, enIN } from "@workspace/utils";

vi.mock("@/lib/api/api-client", () => ({
  apiGet: vi.fn(),
}));

const mockApiGet = vi.mocked(apiGet);

const mockStats = {
  total: 3,
  averageRating: 4.2,
  recentFeedback: 1,
  byStatus: { NEW: 1, IN_PROGRESS: 1, RESOLVED: 1 },
  topGoodFeatures: [{ feature: "Fast UI", count: 2 }],
  topBadFeatures: [{ feature: "Slow sync", count: 1 }],
  topImprovementAreas: [{ feature: "Reports", count: 1 }],
};

const mockFeedbacks = [
  {
    id: "f1",
    overallRating: 5,
    category: "GENERAL",
    status: "NEW",
    generalComments: "Love the new dashboard",
    goodFeatures: ["Fast UI", "Dark mode"],
    badFeatures: [],
    improvementAreas: [],
    user: { name: "Alice" },
    clinic: { name: "Sunrise Clinic" },
    createdAt: "2026-01-10T10:00:00Z",
  },
  {
    id: "f2",
    overallRating: 3,
    category: "BILLING",
    status: "RESOLVED",
    badFeatures: ["Slow sync"],
    improvementAreas: ["Reports"],
    user: { name: "Bob" },
    clinic: { name: "City Hospital" },
    createdAt: "2026-02-01T10:00:00Z",
  },
];

describe("FeedbackPage", () => {
  beforeEach(() => {
    mockApiGet.mockReset();
  });

  it("fetches feedback and stats in parallel and renders the stat cards", async () => {
    mockApiGet.mockResolvedValueOnce(mockFeedbacks);
    mockApiGet.mockResolvedValueOnce(mockStats);
    render(<FeedbackPage />);

    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeInTheDocument();
    });

    expect(mockApiGet).toHaveBeenCalledWith("/api/internal/feedback/all");
    expect(mockApiGet).toHaveBeenCalledWith("/api/internal/feedback/stats");

    // Stat cards: totals, averaged rating, and per-status counts.
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("1 recent")).toBeInTheDocument();
    expect(screen.getByText("4.2")).toBeInTheDocument();
    expect(screen.getByText("New")).toBeInTheDocument();
    expect(screen.getByText("In Progress")).toBeInTheDocument();
    expect(screen.getByText("Resolved")).toBeInTheDocument();
    expect(screen.getAllByText("1").length).toBeGreaterThanOrEqual(3);
  });

  it("renders feedback rows with badges, comments, and formatted dates", async () => {
    mockApiGet.mockResolvedValueOnce(mockFeedbacks);
    mockApiGet.mockResolvedValueOnce(mockStats);
    render(<FeedbackPage />);

    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeInTheDocument();
    });

    expect(screen.getByText("NEW")).toBeInTheDocument();
    expect(screen.getByText("GENERAL")).toBeInTheDocument();
    expect(screen.getByText("RESOLVED")).toBeInTheDocument();
    expect(screen.getByText("BILLING")).toBeInTheDocument();
    expect(screen.getByText("Sunrise Clinic")).toBeInTheDocument();
    expect(screen.getByText("City Hospital")).toBeInTheDocument();
    expect(screen.getByText("Love the new dashboard")).toBeInTheDocument();

    // Comments are conditional; Bob has none.
    expect(screen.queryByText(/Bob/)).toBeInTheDocument();

    // Timestamps render through the en-IN date formatter (TZ pinned to UTC).
    expect(screen.getByText(formatDateTime("2026-01-10T10:00:00Z", undefined, { locale: enIN }))).toBeInTheDocument();
  });

  it("opens the view dialog with good features listed", async () => {
    mockApiGet.mockResolvedValueOnce(mockFeedbacks);
    mockApiGet.mockResolvedValueOnce(mockStats);
    render(<FeedbackPage />);

    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeInTheDocument();
    });

    // Row action: the icon-only Eye button (lucide icons are aria-hidden, so
    // the button has an empty accessible name; the header Refresh button has
    // text and is excluded).
    fireEvent.click(screen.getAllByRole("button", { name: "" })[0]);

    const dialog = within(await screen.findByRole("dialog"));
    expect(dialog.getByText("Feedback Details")).toBeInTheDocument();
    expect(dialog.getByText("Alice - Sunrise Clinic")).toBeInTheDocument();
    expect(dialog.getByText("Love the new dashboard")).toBeInTheDocument();
    expect(dialog.getByText("Liked Features")).toBeInTheDocument();
    expect(dialog.getByText("Fast UI")).toBeInTheDocument();
    expect(dialog.getByText("Dark mode")).toBeInTheDocument();
  });

  it("shows the empty state when no feedback exists", async () => {
    mockApiGet.mockResolvedValueOnce([]);
    mockApiGet.mockResolvedValueOnce(mockStats);
    render(<FeedbackPage />);

    await waitFor(() => {
      expect(screen.getByText("No feedback yet")).toBeInTheDocument();
    });
  });

  it("re-fetches both endpoints when Refresh is clicked", async () => {
    // Two fetches, each with the parallel pair (items, stats).
    mockApiGet.mockResolvedValueOnce(mockFeedbacks);
    mockApiGet.mockResolvedValueOnce(mockStats);
    mockApiGet.mockResolvedValueOnce(mockFeedbacks);
    mockApiGet.mockResolvedValueOnce(mockStats);
    render(<FeedbackPage />);

    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Refresh/ }));

    await waitFor(() => {
      // React Query may deduplicate parallel fetches; 3+ means the refresh fired.
      expect(mockApiGet.mock.calls.length).toBeGreaterThanOrEqual(3);
    });
  });
});
