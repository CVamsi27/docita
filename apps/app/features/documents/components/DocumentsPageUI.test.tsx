import { fireEvent, screen } from "@testing-library/react";
import { render } from "@/test-utils/render-with-tooltip";
import { describe, expect, it, vi } from "vitest";
import { DocumentsPageUI } from "./DocumentsPageUI";

const noop = () => {};

const baseProps = {
  documents: [],
  totalCount: 0,
  loading: false,
  isError: false,
  onRetry: noop,
  searchQuery: "",
  setSearchQuery: noop,
  sortConfig: { key: "date", direction: "desc" } as const,
  handleSort: noop,
  handleView: noop,
  handleDownload: noop,
};

describe("DocumentsPageUI", () => {
  it("renders a page-level empty state when no documents exist", () => {
    render(<DocumentsPageUI {...baseProps} />);

    expect(screen.getByRole("heading", { name: "Documents" })).toBeVisible();
    expect(screen.getByText("No documents yet")).toBeVisible();
  });

  it("renders a retryable page-level error state", () => {
    const onRetry = vi.fn();
    render(<DocumentsPageUI {...baseProps} isError onRetry={onRetry} />);

    fireEvent.click(screen.getByRole("button", { name: /try again|retry/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
