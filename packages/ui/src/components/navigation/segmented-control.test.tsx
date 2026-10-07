import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { SegmentedControl } from "./segmented-control";

const items = [
  { id: "all", label: "All" },
  { id: "today", label: "Today" },
  { id: "overdue", label: "Overdue" },
];

describe("SegmentedControl", () => {
  it("marks only the active option as selected and tabbable", () => {
    render(
      <SegmentedControl items={items} activeId="today" onSelect={() => undefined} />,
    );

    const today = screen.getByRole("tab", { name: "Today" });
    expect(today).toHaveAttribute("aria-selected", "true");
    expect(today).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("tab", { name: "All" })).toHaveAttribute(
      "tabindex",
      "-1",
    );
  });

  it("selects an option on click", () => {
    const onSelect = vi.fn();
    render(<SegmentedControl items={items} activeId="all" onSelect={onSelect} />);

    fireEvent.click(screen.getByRole("tab", { name: "Overdue" }));

    expect(onSelect).toHaveBeenCalledWith("overdue");
  });

  it("moves selection and focus with arrow keys", () => {
    const onSelect = vi.fn();
    render(
      <SegmentedControl items={items} activeId="all" onSelect={onSelect} />,
    );

    const all = screen.getByRole("tab", { name: "All" });
    all.focus();
    fireEvent.keyDown(all, { key: "ArrowRight" });

    expect(screen.getByRole("tab", { name: "Today" })).toHaveFocus();
    expect(onSelect).toHaveBeenCalledWith("today");
  });

  it("jumps to the last and first options with End and Home", () => {
    render(
      <SegmentedControl items={items} activeId="today" onSelect={() => undefined} />,
    );

    const today = screen.getByRole("tab", { name: "Today" });
    today.focus();
    fireEvent.keyDown(today, { key: "End" });
    expect(screen.getByRole("tab", { name: "Overdue" })).toHaveFocus();

    fireEvent.keyDown(screen.getByRole("tab", { name: "Overdue" }), {
      key: "Home",
    });
    expect(screen.getByRole("tab", { name: "All" })).toHaveFocus();
  });

  it("skips disabled options while navigating", () => {
    const onSelect = vi.fn();
    render(
      <SegmentedControl
        items={[items[0], { id: "locked", label: "Locked", disabled: true }, items[2]]}
        activeId="all"
        onSelect={onSelect}
      />,
    );

    const all = screen.getByRole("tab", { name: "All" });
    all.focus();
    fireEvent.keyDown(all, { key: "ArrowRight" });

    expect(screen.getByRole("tab", { name: "Overdue" })).toHaveFocus();
    expect(onSelect).toHaveBeenCalledWith("overdue");
  });

  it("ignores keys outside the tab pattern", () => {
    const onSelect = vi.fn();
    render(
      <SegmentedControl items={items} activeId="all" onSelect={onSelect} />,
    );

    const all = screen.getByRole("tab", { name: "All" });
    all.focus();
    fireEvent.keyDown(all, { key: "ArrowDown" });

    expect(all).toHaveFocus();
    expect(onSelect).not.toHaveBeenCalled();
  });
});
