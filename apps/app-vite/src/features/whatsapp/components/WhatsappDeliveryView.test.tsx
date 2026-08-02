import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WhatsappDeliveryView } from "./WhatsappDeliveryView";

const mockUseWhatsappStats = vi.fn();

vi.mock("@workspace/data-access", () => ({
  useWhatsappStats: () => mockUseWhatsappStats(),
}));

function setHook(value: Record<string, unknown>) {
  mockUseWhatsappStats.mockReturnValue({
    isLoading: false,
    isError: false,
    data: undefined,
    refetch: vi.fn(),
    ...value,
  });
}

describe("WhatsappDeliveryView", () => {
  it("renders the loading state", () => {
    setHook({ isLoading: true });
    render(<WhatsappDeliveryView />);
    expect(screen.getByText(/Loading delivery health/i)).toBeInTheDocument();
  });

  it("renders the error state with retry", () => {
    setHook({ isError: true });
    render(<WhatsappDeliveryView />);
    expect(
      screen.getByText(/could not load WhatsApp delivery health/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /try again/i }),
    ).toBeInTheDocument();
  });

  it("renders delivery stat cards from data", () => {
    setHook({
      data: {
        outboundLast30Days: 124,
        deliveryRate: 97,
        responseRate: 41,
        staleDeliveryCount: 3,
      },
    });
    render(<WhatsappDeliveryView />);
    expect(screen.getByText("Outbound messages")).toBeInTheDocument();
    expect(screen.getByText("124")).toBeInTheDocument();
    expect(screen.getByText("97%")).toBeInTheDocument();
    expect(screen.getByText("41%")).toBeInTheDocument();
  });

  it("shows Unavailable when rates are null", () => {
    setHook({
      data: {
        outboundLast30Days: 0,
        deliveryRate: null,
        responseRate: null,
        staleDeliveryCount: 0,
      },
    });
    render(<WhatsappDeliveryView />);
    expect(screen.getAllByText("Unavailable")).toHaveLength(2);
  });
});
