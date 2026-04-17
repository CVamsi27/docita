import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TeamInviteStep } from "./TeamInviteStep";

describe("TeamInviteStep", () => {
  it("keeps the remove action accessible at the row level and protects the final row", () => {
    render(
      <TeamInviteStep onComplete={vi.fn()} onSkip={vi.fn()} ownerEmail="owner@example.com" />,
    );

    expect(screen.getByText("Step 3: Invite Team")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Member email address"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add another member" })).toBeInTheDocument();

    const firstRemoveButton = screen.getByRole("button", {
      name: "Remove member 1",
    });
    expect(firstRemoveButton).toBeInTheDocument();
    fireEvent.click(firstRemoveButton);
    expect(
      screen.getAllByRole("button", { name: "Remove member 1" }),
    ).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: /add another member/i }));

    expect(screen.getByRole("button", { name: "Remove member 2" })).toBeInTheDocument();
  });
});
