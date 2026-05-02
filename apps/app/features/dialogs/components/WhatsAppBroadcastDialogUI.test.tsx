import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { WhatsAppBroadcastDialogUI } from "./WhatsAppBroadcastDialogUI";

vi.mock("@/features/_shared/components/auth/feature-guard", () => ({
  FeatureGuard: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock("@/lib/stores/permission-store", () => ({
  Feature: {
    BROADCAST_CAMPAIGNS: "BROADCAST_CAMPAIGNS",
  },
}));

describe("WhatsAppBroadcastDialogUI", () => {
  it("validates campaign name and message before submit", async () => {
    const onSubmit = vi.fn();

    render(
      <WhatsAppBroadcastDialogUI
        isOpen
        isLoading={false}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Create Campaign" }));

    expect(await screen.findByText("Enter campaign name.")).toBeInTheDocument();
    expect(screen.getByText("Enter the message")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits valid broadcast data and clears errors when edited", async () => {
    const onSubmit = vi.fn();

    render(
      <WhatsAppBroadcastDialogUI
        isOpen
        isLoading={false}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("Campaign name"), {
      target: { value: "Monthly Reminder" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter message"), {
      target: { value: "Your follow-up visit is due this month." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create Campaign" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          campaignName: "Monthly Reminder",
          message: "Your follow-up visit is due this month.",
          sendToAllPatients: true,
        }),
      );
    });
  });
});
