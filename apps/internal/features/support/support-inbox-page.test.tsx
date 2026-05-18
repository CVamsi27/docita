import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  SupportWhatsAppMessage,
  SupportWhatsAppThreadSummary,
} from "@workspace/types";

const supportApiMocks = vi.hoisted(() => ({
  getWhatsAppThreads: vi.fn(),
  getWhatsAppThreadMessages: vi.fn(),
  markWhatsAppThreadRead: vi.fn(),
  replyToWhatsAppThread: vi.fn(),
}));

vi.mock("@/lib/auth/auth", () => ({
  useAuth: () => ({
    token: "test-token",
  }),
}));

vi.mock("@/lib/api/api", () => ({
  supportAPI: supportApiMocks,
}));

import { SupportInboxPage } from "./support-inbox-page";

function renderWithQueryClient(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe("SupportInboxPage", () => {
  beforeEach(() => {
    supportApiMocks.getWhatsAppThreads.mockReset();
    supportApiMocks.getWhatsAppThreadMessages.mockReset();
    supportApiMocks.markWhatsAppThreadRead.mockReset();
    supportApiMocks.replyToWhatsAppThread.mockReset();
  });

  it("marks the selected thread as read once", async () => {
    const thread: SupportWhatsAppThreadSummary = {
      threadPhoneNumber: "919876543210",
      supportPhoneNumber: "918790311010",
      senderName: "Rahul Sharma",
      lastMessageId: "msg-2",
      lastMessageBody: "Need help",
      lastMessageType: "text",
      lastMessageDirection: "INBOUND",
      lastMessageStatus: "NEW",
      lastMessageAt: new Date("2026-04-12T12:00:00Z"),
      messageCount: 2,
      unreadCount: 1,
    };

    const messages: SupportWhatsAppMessage[] = [
      {
        id: "msg-2",
        providerMessageId: "wamid.2",
        providerSentMessageId: null,
        threadPhoneNumber: "919876543210",
        supportPhoneNumber: "918790311010",
        senderPhoneNumber: "919876543210",
        senderName: "Rahul Sharma",
        direction: "INBOUND",
        messageType: "text",
        messageBody: "Need help",
        status: "READ",
        receivedAt: new Date("2026-04-12T12:00:00Z"),
        respondedAt: null,
        replyToProviderMessageId: null,
        errorMessage: null,
      },
    ];

    supportApiMocks.getWhatsAppThreads.mockResolvedValue([thread]);
    supportApiMocks.getWhatsAppThreadMessages.mockResolvedValue(messages);
    supportApiMocks.markWhatsAppThreadRead.mockResolvedValue({
      updatedCount: 1,
    });

    renderWithQueryClient(<SupportInboxPage />);

    expect(await screen.findByText("Need help")).toBeInTheDocument();

    await waitFor(() => {
      expect(supportApiMocks.markWhatsAppThreadRead).toHaveBeenCalledTimes(1);
    });

    expect(supportApiMocks.markWhatsAppThreadRead).toHaveBeenCalledWith(
      "919876543210",
    );
  });

  it("sends a trimmed WhatsApp reply for the selected thread", async () => {
    const thread: SupportWhatsAppThreadSummary = {
      threadPhoneNumber: "919876543210",
      supportPhoneNumber: "918790311010",
      senderName: "Rahul Sharma",
      lastMessageId: "msg-2",
      lastMessageBody: "Need help",
      lastMessageType: "text",
      lastMessageDirection: "INBOUND",
      lastMessageStatus: "NEW",
      lastMessageAt: new Date("2026-04-12T12:00:00Z"),
      messageCount: 2,
      unreadCount: 1,
    };

    const messages: SupportWhatsAppMessage[] = [
      {
        id: "msg-2",
        providerMessageId: "wamid.2",
        providerSentMessageId: null,
        threadPhoneNumber: "919876543210",
        supportPhoneNumber: "918790311010",
        senderPhoneNumber: "919876543210",
        senderName: "Rahul Sharma",
        direction: "INBOUND",
        messageType: "text",
        messageBody: "Need help",
        status: "READ",
        receivedAt: new Date("2026-04-12T12:00:00Z"),
        respondedAt: null,
        replyToProviderMessageId: null,
        errorMessage: null,
      },
    ];

    supportApiMocks.getWhatsAppThreads.mockResolvedValue([thread]);
    supportApiMocks.getWhatsAppThreadMessages.mockResolvedValue(messages);
    supportApiMocks.markWhatsAppThreadRead.mockResolvedValue({
      updatedCount: 1,
    });
    supportApiMocks.replyToWhatsAppThread.mockResolvedValue({
      id: "reply-1",
    });

    renderWithQueryClient(<SupportInboxPage />);

    const replyBox = await screen.findByPlaceholderText("Enter reply");
    expect(screen.getByRole("button", { name: "Send reply" })).toBeDisabled();

    fireEvent.change(replyBox, {
      target: { value: "  We can help with setup today.  " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send reply" }));

    await waitFor(() => {
      expect(supportApiMocks.replyToWhatsAppThread).toHaveBeenCalledWith(
        "919876543210",
        { message: "We can help with setup today." },
      );
    });
    expect(replyBox).toHaveValue("");
  });
});
