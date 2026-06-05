import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WhatsappOperationsPageContent } from "./WhatsappOperationsPageContent";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/auth/auth-context", () => ({
  useAuth: () => ({ user: { role: "ADMIN_DOCTOR" } }),
}));

vi.mock("./WhatsappConversationsView", () => ({
  WhatsappConversationsView: () => <div>Conversation inbox</div>,
}));

vi.mock("./WhatsappCampaignsView", () => ({
  WhatsappCampaignsView: () => <div>Campaign list</div>,
}));

vi.mock("./WhatsappDeliveryView", () => ({
  WhatsappDeliveryView: () => <div>Delivery health</div>,
}));

vi.mock(
  "@/features/settings/components/whatsapp/WhatsappTemplatesSettings",
  () => ({
    WhatsappTemplatesSettings: () => <div>Template manager</div>,
  }),
);

describe("WhatsappOperationsPageContent", () => {
  it("renders the operational hub with conversations selected by default", () => {
    render(<WhatsappOperationsPageContent />);

    expect(
      screen.getByRole("heading", { name: "WhatsApp" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Conversation inbox")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Sender settings/i }),
    ).toHaveAttribute("href", "/settings/whatsapp-sender");
  });
});
