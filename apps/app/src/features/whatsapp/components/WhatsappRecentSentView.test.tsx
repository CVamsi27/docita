import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WhatsappRecentSentView } from "./WhatsappRecentSentView";

const mockUseRecentSent = vi.fn();

vi.mock("@workspace/data-access", () => ({
  useClinicRecentSentMessages: () => mockUseRecentSent(),
}));

function setHook(value: Record<string, unknown>) {
  mockUseRecentSent.mockReturnValue({
    isLoading: false,
    isError: false,
    data: undefined,
    refetch: vi.fn(),
    ...value,
  });
}

describe("WhatsappRecentSentView", () => {
  it("renders the loading state", () => {
    setHook({ isLoading: true });
    render(<WhatsappRecentSentView />);
    expect(screen.getByText(/Loading sent messages/i)).toBeInTheDocument();
  });

  it("renders the error state with a retry affordance", () => {
    setHook({ isError: true });
    render(<WhatsappRecentSentView />);
    expect(screen.getByText(/could not load sent messages/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /try again/i }),
    ).toBeInTheDocument();
  });

  it("renders the empty state when no messages exist", () => {
    setHook({ data: [] });
    render(<WhatsappRecentSentView />);
    expect(screen.getByText(/No messages sent yet/i)).toBeInTheDocument();
  });

  it("renders sent messages with patient, status, and body", () => {
    setHook({
      data: [
        {
          id: "msg-1",
          patientName: "Asha Rao",
          phoneNumber: "+910000000000",
          status: "DELIVERED",
          createdAt: new Date().toISOString(),
          message: "Your prescription is ready",
          type: "PRESCRIPTION",
        },
      ],
    });
    render(<WhatsappRecentSentView />);
    expect(screen.getByText("Asha Rao")).toBeInTheDocument();
    expect(screen.getByText("DELIVERED")).toBeInTheDocument();
    expect(
      screen.getByText("Your prescription is ready"),
    ).toBeInTheDocument();
  });

  it("falls back to phone number when patient name is absent", () => {
    setHook({
      data: [
        {
          id: "msg-2",
          patientName: null,
          phoneNumber: "+919999999999",
          status: "QUEUED",
          createdAt: new Date().toISOString(),
          message: "Reminder: appointment tomorrow",
          type: "REMINDER",
        },
      ],
    });
    render(<WhatsappRecentSentView />);
    expect(screen.getByText("+919999999999")).toBeInTheDocument();
  });
});
