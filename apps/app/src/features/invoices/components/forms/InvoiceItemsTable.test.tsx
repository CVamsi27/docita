import { fireEvent, screen, within } from "@testing-library/react";
import { render } from "@/test-utils";
import { describe, expect, it, vi } from "vitest";
import { InvoiceItemsTable } from "./InvoiceItemsTable";

/**
 * Local messages mirror for the Invoices.itemsTable namespace —
 * the test mocks react-i18next so useTranslation("Invoices") resolves
 * against these English strings. removeLineItemTooltip is a plain
 * "{name}" template (real en.json uses ICU select) that the mock's
 * t() interpolates.
 */
const invoiceMessages = vi.hoisted(() => ({
  Invoices: {
    itemsTable: {
      emptyMessage: "No items added yet.",
      colDescription: "Description",
      colQty: "Qty",
      colUnitPrice: "Unit price",
      colTax: "Tax",
      colGstPercent: "GST %",
      colHsnSac: "HSN/SAC",
      colTotal: "Total",
      itemDescriptionPlaceholder: "Item description",
      taxHealthcareExempt: "Healthcare exempt",
      taxTaxable: "Taxable",
      taxExempt: "Exempt",
      taxNonGst: "Non-GST",
      hsnCodePlaceholder: "HSN code",
      removeLineItemTooltip: "Remove {name}",
    },
  },
}));

vi.mock("react-i18next", () => ({
  useTranslation: (ns?: string) => {
    const t = (
      key: string,
      params?: Record<string, string | number>,
    ): string => {
      const path = ns ? `${ns}.${key}` : key;
      const resolved = path
        .split(".")
        .reduce<unknown>(
          (acc, part) =>
            acc && typeof acc === "object"
              ? (acc as Record<string, unknown>)[part]
              : undefined,
          invoiceMessages,
        );
      if (typeof resolved !== "string") return key;
      return resolved.replace(/\{name\}/g, String(params?.name ?? ""));
    };
    return { t };
  },
}));

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
  const desktopTable = () => screen.getByRole("table");

  it("renders tax controls and disables GST rate for exempt healthcare lines", () => {
    render(
      <InvoiceItemsTable
        items={[baseItem]}
        onUpdateItem={vi.fn()}
        onRemoveItem={vi.fn()}
        formatCurrency={(amount) => `Rs ${amount}`}
      />,
    );

    expect(
      within(desktopTable()).getByDisplayValue("Consultation"),
    ).toBeInTheDocument();
    expect(
      within(desktopTable()).getByText("Healthcare exempt"),
    ).toBeInTheDocument();
    expect(
      within(desktopTable()).getByRole("spinbutton", { name: "GST %" }),
    ).toBeDisabled();
    expect(
      within(desktopTable()).getByRole("spinbutton", { name: "Qty" }),
    ).toHaveValue(1);
    expect(
      within(desktopTable()).getByRole("spinbutton", { name: "Unit price" }),
    ).toHaveValue(500);
    expect(
      within(desktopTable()).getByRole("combobox", {
        name: "Tax",
        exact: true,
      }),
    ).toBeInTheDocument();
    expect(
      within(desktopTable()).getByPlaceholderText("HSN code"),
    ).toBeInTheDocument();
    expect(within(desktopTable()).getByText("Rs 500")).toBeInTheDocument();
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

    fireEvent.change(within(desktopTable()).getByDisplayValue("1"), {
      target: { value: "2" },
    });
    fireEvent.change(within(desktopTable()).getByDisplayValue("18"), {
      target: { value: "12" },
    });
    fireEvent.change(within(desktopTable()).getByPlaceholderText("HSN code"), {
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
