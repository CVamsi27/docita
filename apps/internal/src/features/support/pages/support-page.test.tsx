import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { SupportPage } from "./support-page";
import { apiGet, apiPost } from "@/lib/api/api-client";

vi.mock("@/lib/api/api-client", () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
}));

const mockApiGet = vi.mocked(apiGet);
const mockApiPost = vi.mocked(apiPost);

const PHONE_1 = "+919876543210";
const PHONE_2 = "+919999999999";

const mockThreads = [
  {
    threadPhoneNumber: PHONE_1,
    senderName: "Ravi Kumar",
    lastMessageBody: "Need help with billing",
    lastMessageAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    unreadCount: 2,
    lastMessageType: "text",
    lastMessageDirection: "INBOUND",
  },
  {
    threadPhoneNumber: PHONE_2,
    lastMessageBody: "Thanks!",
    lastMessageAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    unreadCount: 0,
    lastMessageType: "text",
    lastMessageDirection: "OUTBOUND",
  },
];

const mockMessages = [
  { id: "m1", body: "Need help with billing", from: PHONE_1, createdAt: "2026-01-10T10:00:00Z", direction: "INBOUND" },
  { id: "m2", body: "Hi Ravi, we are on it", from: "support", createdAt: "2026-01-10T10:05:00Z", direction: "OUTBOUND" },
];

// "Hi Ravi, we are on it" only exists in the messages panel (the thread button
// shows the lastMessageBody "Need help with billing"), so waiting on it means
// the auto-select chain (threads -> messages fetch) has fully settled.
const waitForMessages = () =>
  waitFor(() => expect(screen.getByText("Hi Ravi, we are on it")).toBeInTheDocument());

describe("SupportPage", () => {
  beforeEach(() => {
    mockApiGet.mockReset();
    mockApiPost.mockReset();
  });

  it("fetches threads, auto-selects the first, and renders messages with direction styling", async () => {
    mockApiGet.mockResolvedValueOnce(mockThreads);
    mockApiGet.mockResolvedValueOnce(mockMessages);
    render(<SupportPage />);

    await waitForMessages();

    expect(mockApiGet).toHaveBeenCalledWith("/api/internal/support/whatsapp");
    expect(mockApiGet).toHaveBeenCalledWith(
      `/api/internal/support/whatsapp/${PHONE_1}/messages`,
    );

    // Thread list: sender name (button + selected header), unread badge only
    // when unreadCount > 0, last message body.
    expect(screen.getAllByText("Ravi Kumar").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("2 new")).toBeInTheDocument();
    expect(screen.getAllByText("Need help with billing").length).toBeGreaterThanOrEqual(1);
    // Second thread has no sender name -> phone shown, no unread badge.
    expect(screen.getByText(PHONE_2)).toBeInTheDocument();
    expect(screen.queryByText("0 new")).not.toBeInTheDocument();

    // Messages render with direction-based styling (OUTBOUND is primary).
    const outbound = screen.getByText("Hi Ravi, we are on it").closest("div") as HTMLElement;
    expect(outbound.className).toContain("bg-primary");
    const inbound = screen.getAllByText("Need help with billing")[1].closest("div") as HTMLElement;
    expect(inbound.className).toContain("bg-muted");
  });

  it("filters threads by sender name and phone", async () => {
    mockApiGet.mockResolvedValueOnce(mockThreads);
    mockApiGet.mockResolvedValueOnce(mockMessages);
    render(<SupportPage />);

    await waitForMessages();

    // Filter by sender name (case-insensitive): the named thread stays (its
    // button shows the sender name, not the phone) and the second disappears.
    fireEvent.change(screen.getByPlaceholderText("Enter name, phone, or message"), {
      target: { value: "ravi" },
    });
    // Present in both the thread button and the selected-thread header.
    expect(screen.getAllByText("Ravi Kumar").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText(PHONE_2)).not.toBeInTheDocument();

    // Filter by phone: the other thread remains; the selected thread is no
    // longer in the filtered set, so the header falls back.
    fireEvent.change(screen.getByPlaceholderText("Enter name, phone, or message"), {
      target: { value: PHONE_2 },
    });
    expect(screen.getByText(PHONE_2)).toBeInTheDocument();
    expect(screen.getByText("No thread selected.")).toBeInTheDocument();
  });

  it("sends a reply via apiPost and re-fetches the thread messages", async () => {
    mockApiGet.mockResolvedValueOnce(mockThreads);
    mockApiGet.mockResolvedValueOnce(mockMessages);
    mockApiGet.mockResolvedValueOnce([
      ...mockMessages,
      { id: "m3", body: "Got it, thanks", from: "support", createdAt: "2026-01-10T10:10:00Z", direction: "OUTBOUND" },
    ]);
    render(<SupportPage />);

    await waitForMessages();

    const textarea = screen.getByPlaceholderText("Type your reply…");
    const composer = textarea.closest("div") as HTMLElement;

    // Send is disabled while empty.
    expect(within(composer).getByRole("button")).toBeDisabled();

    fireEvent.change(textarea, { target: { value: "Got it, thanks" } });
    expect(within(composer).getByRole("button")).toBeEnabled();

    fireEvent.click(within(composer).getByRole("button"));

    await waitFor(() => {
      expect(mockApiPost).toHaveBeenCalledWith(
        `/api/internal/support/whatsapp/${PHONE_1}/reply`,
        { message: "Got it, thanks" },
      );
    });

    // Textarea clears and messages are re-fetched.
    await waitFor(() => {
      expect(screen.getByText("Got it, thanks")).toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText("Type your reply…")).toHaveValue("");
    expect(mockApiGet).toHaveBeenCalledTimes(3);
  });

  it("shows the empty thread state when no conversations exist", async () => {
    mockApiGet.mockResolvedValueOnce([]);
    render(<SupportPage />);

    await waitFor(() => {
      expect(
        screen.getByText("No WhatsApp conversations found"),
      ).toBeInTheDocument();
    });
  });

  it("switches to the Inquiries tab", async () => {
    mockApiGet.mockResolvedValueOnce(mockThreads);
    mockApiGet.mockResolvedValueOnce(mockMessages);
    render(<SupportPage />);

    await waitForMessages();

    // PageTabs is a hand-rolled strip that activates on click (not radix).
    fireEvent.click(screen.getByRole("tab", { name: /Inquiries/ }));

    await waitFor(() => {
      expect(screen.getByText("Support Inquiries")).toBeInTheDocument();
    });
    expect(screen.getByText("No inquiries yet.")).toBeInTheDocument();
  });
});
