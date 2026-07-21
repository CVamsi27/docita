import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DataAccessProvider, type RequestConfig } from "@workspace/data-access";
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

// English literal map mirroring the SupportInbox JSON keys the
// components use, so test assertions on hardcoded English still match
// after the i18n refactor.
const supportInboxCopy: Record<string, string> = {
  threadsLabel: "Threads",
  unreadLabel: "Unread",
  loadingMessage: "Loading WhatsApp conversations…",
  emptyTitle: "No conversations yet",
  emptyDescription:
    "New WhatsApp messages will appear here when customers contact support.",
  // Sub-component copy that test assertions still rely on:
  replyPlaceholder: "Enter reply",
  replyButton: "Send reply",
  threadReplyPlaceholder: "Enter reply",
  threadReplyButton: "Send reply",
};

vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => supportInboxCopy[key] ?? key,
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

  const fetcher = <T,>(
    endpoint: string,
    _options?: RequestConfig,
  ): Promise<T> => {
    if (endpoint.startsWith("/internal/support/whatsapp?")) {
      return supportApiMocks.getWhatsAppThreads() as Promise<T>;
    }

    const threadMessagesMatch = endpoint.match(
      /^\/internal\/support\/whatsapp\/([^/]+)\/messages\?/,
    );
    if (threadMessagesMatch) return supportApiMocks.getWhatsAppThreadMessages(
        decodeURIComponent(threadMessagesMatch[1]),
      ) as Promise<T>;

    return Promise.reject(new Error(`Unexpected data-access GET ${endpoint}`));
  };

  return render(
    <QueryClientProvider client={queryClient}>
      <DataAccessProvider
        config={{
          fetcher,
          getClinicId: () => undefined,
          getClinicTimezone: () => undefined,
          isTierFeatureEnabled: () => true,
        }}
      >
        {ui}
      </DataAccessProvider>
    </QueryClientProvider>,
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
