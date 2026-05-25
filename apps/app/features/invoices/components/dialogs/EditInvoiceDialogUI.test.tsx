import type { ReactElement } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { InvoiceItem } from "@workspace/types";
import { EditInvoiceDialogUI } from "./EditInvoiceDialogUI";

/** Dialog content portals outside a test wrapper; avoid Radix tooltip context there. */
vi.mock("@workspace/ui/components/overlay/tooltip", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@workspace/ui/components/overlay/tooltip")>();
  return {
    ...actual,
    SymbolTooltip: ({ children }: { children: ReactElement }) => children,
  };
});

vi.mock("@/hooks/use-clinic-currency", () => ({
  useClinicCurrency: () => ({
    formatCurrency: (amount: number) => `INR ${amount.toFixed(2)}`,
  }),
}));

const invoiceItems = [
  {
    description: "Consultation",
    quantity: 1,
    price: 500,
  },
] as InvoiceItem[];

describe("EditInvoiceDialogUI", () => {
  it("renders invoice details and wires item editing actions", () => {
    const onUpdateItem = vi.fn();
    const onAddItem = vi.fn();

    render(
      <EditInvoiceDialogUI
        open
        patientName="Asha Rao"
        items={invoiceItems}
        status="PENDING"
        loading={false}
        statusOptions={[
          { value: "PENDING", label: "Pending" },
          { value: "PAID", label: "Paid" },
        ]}
        onOpenChange={vi.fn()}
        onStatusChange={vi.fn()}
        onAddItem={onAddItem}
        onRemoveItem={vi.fn()}
        onUpdateItem={onUpdateItem}
        onSubmit={vi.fn()}
        calculateTotal={() => 500}
      />,
    );

    expect(screen.getByText("Edit Invoice")).toBeInTheDocument();
    expect(
      screen.getByText("Update invoice details for Asha Rao"),
    ).toBeInTheDocument();
    expect(screen.getByText("INR 500.00")).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText("Description"), {
      target: { value: "Follow-up consultation" },
    });
    fireEvent.change(screen.getByPlaceholderText("Qty"), {
      target: { value: "2" },
    });
    fireEvent.change(screen.getByPlaceholderText("Price"), {
      target: { value: "750" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Add Item/i }));

    expect(onUpdateItem).toHaveBeenCalledWith(
      0,
      "description",
      "Follow-up consultation",
    );
    expect(onUpdateItem).toHaveBeenCalledWith(0, "quantity", 2);
    expect(onUpdateItem).toHaveBeenCalledWith(0, "price", 750);
    expect(onAddItem).toHaveBeenCalled();
  });

  it("shows empty item state and submits via dialog footer", async () => {
    const onSubmit = vi.fn();

    render(
      <EditInvoiceDialogUI
        open
        patientName="Asha Rao"
        items={[]}
        status="PENDING"
        loading={false}
        statusOptions={[{ value: "PENDING", label: "Pending" }]}
        onOpenChange={vi.fn()}
        onStatusChange={vi.fn()}
        onAddItem={vi.fn()}
        onRemoveItem={vi.fn()}
        onUpdateItem={vi.fn()}
        onSubmit={onSubmit}
        calculateTotal={() => 0}
      />,
    );

    expect(
      screen.getByText('No items. Click "Add Item" to add one.'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });
  });
});
