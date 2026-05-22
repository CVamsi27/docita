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
});
