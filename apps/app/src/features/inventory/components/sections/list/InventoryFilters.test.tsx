import { screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { render } from "@/test-utils";
import { InventoryFilters } from "./InventoryFilters";

it("names both filters when no category or stock selection is displayed", () => {
  render(
    <InventoryFilters
      searchQuery=""
      setSearchQuery={vi.fn()}
      categoryFilter=""
      setCategoryFilter={vi.fn()}
      stockFilter=""
      setStockFilter={vi.fn()}
      uniqueCategories={[]}
    />,
  );
  expect(screen.getByRole("combobox", { name: "Category" })).toBeVisible();
  expect(screen.getByRole("combobox", { name: "Stock Status" })).toBeVisible();
});
