import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PageTabs } from "./page-tabs";

const items = [
  { id: "overview", label: "Overview" },
  { id: "transactions", label: "Transactions" },
  { id: "reports", label: "Reports" },
];

describe("PageTabs", () => {
  it("marks the active tab with aria-selected", () => {
    render(
      <PageTabs items={items} activeId="transactions" onSelect={() => undefined} />,
    );
    const active = screen.getByRole("tab", { name: /transactions/i });
    expect(active).toHaveAttribute("aria-selected", "true");
    const overview = screen.getByRole("tab", { name: /overview/i });
    expect(overview).toHaveAttribute("aria-selected", "false");
  });

  it("invokes onSelect when a tab is clicked", () => {
    const onSelect = vi.fn();
    render(<PageTabs items={items} activeId="overview" onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("tab", { name: /reports/i }));
    expect(onSelect).toHaveBeenCalledWith("reports");
  });

  it("renders disabled tabs as not focusable", () => {
    const disabledItems = [
      ...items,
      { id: "locked", label: "Locked", disabled: true },
    ];
    render(<PageTabs items={disabledItems} activeId="overview" />);
    const locked = screen.getByRole("tab", { name: /locked/i });
    expect(locked).toHaveAttribute("aria-disabled", "true");
  });

  it("moves focus and selection with arrow keys", () => {
    const onSelect = vi.fn();
    render(<PageTabs items={items} activeId="overview" onSelect={onSelect} />);

    const overview = screen.getByRole("tab", { name: /overview/i });
    overview.focus();
    fireEvent.keyDown(overview, { key: "ArrowRight" });

    expect(screen.getByRole("tab", { name: /transactions/i })).toHaveFocus();
    expect(onSelect).toHaveBeenCalledWith("transactions");
  });

  it("wraps backwards from the first tab to the last", () => {
    const onSelect = vi.fn();
    render(<PageTabs items={items} activeId="overview" onSelect={onSelect} />);

    const overview = screen.getByRole("tab", { name: /overview/i });
    overview.focus();
    fireEvent.keyDown(overview, { key: "ArrowLeft" });

    expect(screen.getByRole("tab", { name: /reports/i })).toHaveFocus();
    expect(onSelect).toHaveBeenCalledWith("reports");
  });

  it("jumps to the first and last tabs with Home and End", () => {
    const onSelect = vi.fn();
    render(<PageTabs items={items} activeId="overview" onSelect={onSelect} />);

    const overview = screen.getByRole("tab", { name: /overview/i });
    overview.focus();
    fireEvent.keyDown(overview, { key: "End" });

    const reports = screen.getByRole("tab", { name: /reports/i });
    expect(reports).toHaveFocus();

    fireEvent.keyDown(reports, { key: "Home" });
    expect(overview).toHaveFocus();
    expect(onSelect).toHaveBeenNthCalledWith(1, "reports");
    expect(onSelect).toHaveBeenNthCalledWith(2, "overview");
  });

  it("skips disabled tabs while navigating with arrow keys", () => {
    const onSelect = vi.fn();
    render(
      <PageTabs
        items={[
          items[0],
          { id: "locked", label: "Locked", disabled: true },
          items[2],
        ]}
        activeId="overview"
        onSelect={onSelect}
      />,
    );

    const overview = screen.getByRole("tab", { name: /overview/i });
    overview.focus();
    fireEvent.keyDown(overview, { key: "ArrowRight" });

    expect(screen.getByRole("tab", { name: /reports/i })).toHaveFocus();
    expect(onSelect).toHaveBeenCalledWith("reports");
  });

  it("moves focus without selecting when tabs navigate by href", () => {
    const onSelect = vi.fn();
    render(
      <PageTabs
        items={items.map((item) => ({ ...item, href: `/${item.id}` }))}
        activeId="overview"
        onSelect={onSelect}
        renderLink={(_item, content) => <>{content}</>}
      />,
    );

    const overview = screen.getByRole("tab", { name: /overview/i });
    overview.focus();
    fireEvent.keyDown(overview, { key: "ArrowRight" });

    expect(screen.getByRole("tab", { name: /transactions/i })).toHaveFocus();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("ignores keys outside the tab pattern", () => {
    const onSelect = vi.fn();
    render(<PageTabs items={items} activeId="overview" onSelect={onSelect} />);

    const overview = screen.getByRole("tab", { name: /overview/i });
    overview.focus();
    fireEvent.keyDown(overview, { key: "ArrowDown" });

    expect(overview).toHaveFocus();
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("keeps the tab strip horizontally scrollable at every breakpoint", () => {
    render(<PageTabs items={items} activeId="overview" />);

    const tablist = screen.getByRole("tablist");
    expect(tablist.parentElement).toHaveClass(
      "overflow-x-auto",
      "overscroll-x-contain",
      "[scrollbar-width:thin]",
    );
    expect(tablist).toHaveClass("w-max", "min-w-full");
  });
});
