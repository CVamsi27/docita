import { fireEvent, screen, within } from "@testing-library/react";
import { render } from "@/test-utils/render-with-tooltip";
import { describe, expect, it, vi } from "vitest";
import { InvoiceItemsTable } from "./InvoiceItemsTable";

const baseItem = {
  id: "item-1",
  description: "Consultation",
  quantity: 1,
  unitPrice: 500,
  taxTreatment: "EXEMPT_HEALTHCARE",
  taxRate: 0,
  hsnCode: "",
  sacCode: "",
  total: 500,
};

describe("InvoiceItemsTable", () => {
  it("renders tax controls and disables GST rate for exempt healthcare lines", () => {
    render(
      <InvoiceItemsTable
        items={[baseItem]}
        onUpdateItem={vi.fn()}
        onRemoveItem={vi.fn()}
        formatCurrency={(amount) => `Rs ${amount}`}
      />,
    );

    expect(screen.getByDisplayValue("Consultation")).toBeInTheDocument();
    expect(screen.getByText("Healthcare exempt")).toBeInTheDocument();
    expect(screen.getByDisplayValue("0")).toBeDisabled();
    expect(screen.getByPlaceholderText("HSN code")).toBeInTheDocument();
    expect(screen.getByText("Rs 500")).toBeInTheDocument();
  });

  it("emits updates for quantity, GST rate, HSN/SAC, and remove actions", () => {
    const onUpdateItem = vi.fn();
    const onRemoveItem = vi.fn();

    render(
      <InvoiceItemsTable
        items={[{ ...baseItem, taxTreatment: "TAXABLE", taxRate: 18 }]}
        onUpdateItem={onUpdateItem}
        onRemoveItem={onRemoveItem}
        formatCurrency={(amount) => `Rs ${amount}`}
      />,
    );

    fireEvent.change(screen.getByDisplayValue("1"), {
      target: { value: "2" },
    });
    fireEvent.change(screen.getByDisplayValue("18"), {
      target: { value: "12" },
    });
    fireEvent.change(screen.getByPlaceholderText("HSN code"), {
      target: { value: "9983" },
    });

    const row = screen.getByRole("row", { name: /Consultation/i });
    fireEvent.click(
      within(row).getByRole("button", { name: "Remove Consultation" }),
    );

    expect(onUpdateItem).toHaveBeenCalledWith(0, "quantity", 2);
    expect(onUpdateItem).toHaveBeenCalledWith(0, "taxRate", 12);
    expect(onUpdateItem).toHaveBeenCalledWith(0, "hsnCode", "9983");
    expect(onRemoveItem).toHaveBeenCalledWith(0);
  });
});
