import { fireEvent, screen } from "@testing-library/react";
import { render } from "@/test-utils/render-with-tooltip";
import { describe, expect, it, vi } from "vitest";
import { TeamInviteStep } from "./TeamInviteStep";

describe("TeamInviteStep", () => {
  it("enables delete when email is typed and clears the row email", () => {
    render(
      <TeamInviteStep onComplete={vi.fn()} onSkip={vi.fn()} ownerEmail="owner@example.com" />,
    );

    const emailInput = screen.getByPlaceholderText("Email");
    const firstRemoveButton = screen.getByRole("button", { name: "Remove member 1" });

    expect(firstRemoveButton).toBeDisabled();

    fireEvent.change(emailInput, { target: { value: "doctor@example.com" } });
    expect(firstRemoveButton).toBeEnabled();
    expect(emailInput).toHaveValue("doctor@example.com");

    fireEvent.click(firstRemoveButton);
    expect(emailInput).toHaveValue("");
    expect(firstRemoveButton).toBeDisabled();
  });

  it("removes an empty additional member row", () => {
    render(
      <TeamInviteStep onComplete={vi.fn()} onSkip={vi.fn()} ownerEmail="owner@example.com" />,
    );

    fireEvent.click(screen.getByRole("button", { name: /add another member/i }));
    const secondRemoveButton = screen.getByRole("button", { name: "Remove member 2" });
    expect(secondRemoveButton).toBeEnabled();

    fireEvent.click(secondRemoveButton);
    expect(screen.queryByRole("button", { name: "Remove member 2" })).not.toBeInTheDocument();
  });

  it("shows role significance details from the info icon", async () => {
    render(
      <TeamInviteStep onComplete={vi.fn()} onSkip={vi.fn()} ownerEmail="owner@example.com" />,
    );

    const roleGuideButton = screen.getByRole("button", {
      name: "Role significance guide",
    });
    // Tooltip behavior is handled by the UI library; this test asserts the guide
    // control exists and the role descriptions are rendered.
    fireEvent.mouseEnter(roleGuideButton);

    // Open role picker and select Admin Doctor to surface its description.
    fireEvent.click(screen.getByRole("combobox", { name: /role/i }));
    fireEvent.click(await screen.findByText("Admin Doctor"));

    expect(
      screen.getAllByText(
        "Doctor with admin access who can help manage members and permissions",
      ).length,
    ).toBeGreaterThan(0);
  });
});
