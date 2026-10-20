import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@/test-utils";
import { BroadcastsPage } from "./broadcasts-page";
import { apiGet, apiPost } from "@/lib/api/api-client";

vi.mock("@/lib/api/api-client", () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}));

const mockApiGet = vi.mocked(apiGet);
const mockApiPost = vi.mocked(apiPost);

const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

const mockJobs = [
  {
    id: "b1",
    title: "Product Update",
    audienceLabel: "All Clinic Admins",
    status: "COMPLETED",
    sentCount: 42,
    totalCount: 42,
    failedCount: 0,
    createdAt: oneHourAgo,
  },
  {
    id: "b2",
    title: "Trial Reminder",
    status: "COMPLETED",
    sentCount: 38,
    totalCount: 41,
    failedCount: 3,
    createdAt: oneHourAgo,
  },
];

describe("BroadcastsPage", () => {
  beforeEach(() => {
    mockApiGet.mockReset();
    mockApiPost.mockReset();
    mockApiGet.mockResolvedValue([]);
    mockApiPost.mockResolvedValue({});
  });

  it("fetches broadcast history and renders job cards with counts and relative time", async () => {
    mockApiGet.mockResolvedValueOnce(mockJobs);
    render(<BroadcastsPage />);

    await waitFor(() => {
      expect(screen.getByText("Product Update")).toBeInTheDocument();
    });

    expect(mockApiGet).toHaveBeenCalledWith("/api/internal/broadcasts");

    // Present in the history card (the preset select trigger also shows this
    // label, so assert at least one occurrence).
    expect(screen.getAllByText("All Clinic Admins").length).toBeGreaterThanOrEqual(1);
    // Missing audience label falls back.
    expect(screen.getByText("No audience label")).toBeInTheDocument();
    expect(screen.getAllByText("COMPLETED")).toHaveLength(2);

    // Sent counts and the conditional failed counter.
    expect(screen.getByText("Sent: 42/42")).toBeInTheDocument();
    expect(screen.getByText("Sent: 38/41")).toBeInTheDocument();
    expect(screen.getByText("3 failed")).toBeInTheDocument();
    // Failed count of 0 renders nothing.
    expect(screen.queryByText("0 failed")).not.toBeInTheDocument();

    // Relative time is TZ-independent; both fixture jobs are 1h old.
    expect(screen.getAllByText("1h ago")).toHaveLength(2);
  });

  it("shows the empty state when no broadcasts exist", async () => {
    render(<BroadcastsPage />);

    await waitFor(() => {
      expect(screen.getByText("No broadcasts yet")).toBeInTheDocument();
    });
    expect(
      screen.getByText("Your broadcast history will appear here."),
    ).toBeInTheDocument();
  });

  it("submits with the preset label as the title fallback and refreshes history", async () => {
    mockApiGet.mockResolvedValue(mockJobs);
    render(<BroadcastsPage />);

    await waitFor(() => {
      expect(screen.getByText("Product Update")).toBeInTheDocument();
    });

    // Default preset description is visible.
    expect(screen.getByText("Send to all clinic admin users")).toBeInTheDocument();

    // Empty title -> falls back to the preset label.
    fireEvent.click(screen.getByRole("button", { name: /Send Broadcast/ }));

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith("/api/internal/broadcasts", {
        presetId: "all_clinics",
        title: "All Clinic Admins",
        useTemplate: true,
        message: "",
      });
    });
    // History is re-fetched after a successful submit.
    expect(mockApiGet).toHaveBeenCalledTimes(2);
  });

  it("switches preset and submits a custom title with the custom message when the template is off", async () => {
    render(<BroadcastsPage />);

    // Switch the audience preset via the radix Select.
    fireEvent.click(screen.getByRole("combobox"));
    const listbox = within(await screen.findByRole("listbox"));
    fireEvent.click(listbox.getByText("Expiring Trials"));

    await waitFor(() => {
      expect(
        screen.getByText("Clinics whose free trial is ending soon"),
      ).toBeInTheDocument();
    });

    // Disable the template to reveal the custom message textarea.
    fireEvent.click(screen.getByRole("checkbox"));
    const textarea = screen.getByPlaceholderText("Enter custom message…");
    fireEvent.change(textarea, { target: { value: "Upgrade now" } });

    fireEvent.change(screen.getByPlaceholderText("Enter a title for this broadcast"), {
      target: { value: "Trial ending" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Send Broadcast/ }));

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith("/api/internal/broadcasts", {
        presetId: "expiring_trials",
        title: "Trial ending",
        useTemplate: false,
        message: "Upgrade now",
      });
    });

    // Fields reset after submit.
    expect(
      screen.getByPlaceholderText("Enter a title for this broadcast"),
    ).toHaveValue("");
  });
});
