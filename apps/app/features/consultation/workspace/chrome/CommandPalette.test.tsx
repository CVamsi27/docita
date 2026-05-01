import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CommandPalette } from "./CommandPalette";

describe("CommandPalette", () => {
  it("renders grouped actions and runs the selected one", async () => {
    const goSubjective = vi.fn();
    const addMedication = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <CommandPalette
        open
        onOpenChange={onOpenChange}
        actions={[
          {
            id: "nav-subjective",
            label: "Go to Subjective",
            group: "Navigate",
            onRun: goSubjective,
          },
          {
            id: "add-medication",
            label: "Add medication",
            group: "Add",
            onRun: addMedication,
          },
        ]}
      />,
    );

    expect(screen.getByText("Navigate")).toBeInTheDocument();
    expect(screen.getByText("Add")).toBeInTheDocument();

    const item = screen.getByRole("option", { name: /Go to Subjective/i });
    fireEvent.click(item);

    expect(goSubjective).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("filters commands based on user input", () => {
    render(
      <CommandPalette
        open
        onOpenChange={() => {}}
        actions={[
          {
            id: "nav-plan",
            label: "Go to Plan",
            group: "Navigate",
            onRun: () => {},
          },
          {
            id: "add-dx",
            label: "Add diagnosis",
            group: "Add",
            onRun: () => {},
          },
        ]}
      />,
    );

    const input = screen.getByPlaceholderText("Enter command");
    fireEvent.change(input, { target: { value: "diagnosis" } });

    expect(
      screen.queryByRole("option", { name: /Go to Plan/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: /Add diagnosis/i }),
    ).toBeInTheDocument();
  });
});
