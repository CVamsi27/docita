import { fireEvent, render, screen, within } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { StepProgress } from "./step-progress";

it("keeps the active step and navigation action inside semantic list items", () => {
  const handleSelect = vi.fn();
  render(
    <StepProgress
      items={[
        { id: "subjective", label: "Subjective" },
        { id: "plan", label: "Plan" },
      ]}
      activeId="subjective"
      onSelect={handleSelect}
      ariaLabel="Consultation sections"
      compact
    />,
  );
  const list = screen.getByRole("list", { name: "Consultation sections" });
  expect(within(list).getAllByRole("listitem")).toHaveLength(2);
  expect(
    within(list).getByRole("button", { name: "Subjective" }),
  ).toHaveAttribute("aria-current", "step");
  fireEvent.click(within(list).getByRole("button", { name: "Plan" }));
  expect(handleSelect).toHaveBeenCalledWith("plan");
});

it("keeps compact step labels in the accessibility tree without navigation actions", () => {
  render(
    <StepProgress
      items={[{ id: "subjective", label: "Subjective" }]}
      activeId="subjective"
      compact
    />,
  );
  const item = screen.getByRole("listitem");
  expect(within(item).getByText("Subjective")).toHaveClass("sr-only");
  expect(within(item).queryByRole("button")).not.toBeInTheDocument();
});
