import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@workspace/ui/components/tooltip";
import { NotificationPanel } from "./notification-panel";

vi.mock("@/hooks/api/use-notifications", () => {
  const now = new Date("2026-05-06T10:00:00.000Z");
  return {
    useNotifications: () => ({
      data: [
        {
          id: "n1",
          type: "APPOINTMENT_REQUEST_CREATED",
          title: "New appointment request",
          message: "A patient requested an appointment.",
          priority: "HIGH",
          isRead: false,
          readAt: null,
          deletedAt: null,
          createdAt: now,
        },
        {
          id: "n2",
          type: "INVOICE_PENDING",
          title: "Invoice Approval Required",
          message: "Approval needed.",
          priority: "HIGH",
          isRead: false,
          readAt: null,
          deletedAt: null,
          createdAt: now,
        },
      ],
      refetch: vi.fn(),
    }),
    useMarkNotificationRead: () => ({ mutateAsync: vi.fn() }),
    useDeleteAllNotifications: () => ({ mutateAsync: vi.fn() }),
  };
});

vi.mock("@/lib/socket-context", () => ({
  useSocket: () => ({ socket: null }),
}));

function renderWithQuery(ui: React.ReactNode) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <TooltipProvider>{ui}</TooltipProvider>
    </QueryClientProvider>,
  );
}

describe("NotificationPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("filters to Appointment requests tab", async () => {
    renderWithQuery(<NotificationPanel open onOpenChange={() => {}} enabled />);

    expect(
      await screen.findByText(/new appointment request/i),
    ).toBeVisible();
    expect(await screen.findByText(/invoice approval required/i)).toBeVisible();

    const appointmentRequestsTab = await screen.findByRole("tab", {
      name: /appointment requests/i,
    });
    fireEvent.mouseDown(appointmentRequestsTab);
    fireEvent.click(appointmentRequestsTab);

    expect(
      await screen.findByText(/new appointment request/i),
    ).toBeVisible();
    await waitFor(() => {
      expect(screen.queryByText(/invoice approval required/i)).toBeNull();
    });
  });
});

