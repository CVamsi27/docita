import type { ReactElement } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InvoiceEditUI } from "./InvoiceEditUI";

/**
 * Local messages mirror covering all namespaces read by
 * InvoiceEditUI + its child components. The test renders
 * InvoiceEditUI via NextIntlClientProvider so useTranslations
 * resolves against these English strings.
 */
const messages = {
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
      removeLineItemTooltip: "Remove {name, select, undefined {line item} other {{name}}}",
    },
    formSections: {
      invoiceDetailsTitle: "Invoice details",
      lineItemsTitle: "Line items",
      addItemButton: "Add Item",
      statusLabel: "Status",
      statusPlaceholder: "Status",
      statusPending: "Pending",
      statusPaid: "Paid",
      statusOverdue: "Overdue",
      statusCancelled: "Cancelled",
      notesTitle: "Notes",
      notesDescription: "Add any additional notes or payment instructions",
      notesPlaceholder: "Notes",
    },
  },
};

function renderWithIntl(node: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {node}
    </NextIntlClientProvider>,
  );
}

vi.mock("@workspace/ui/components/overlay/tooltip", () => ({
  SymbolTooltip: ({ children }: { children: ReactElement }) => children,
}));

vi.mock("@/components/auth/feature-gate", () => ({
  FeatureGate: ({ children }: { children: ReactElement }) => children,
}));

const invoiceEditMocks = vi.hoisted(() => ({
  onSubmit: vi.fn(),
  routerPush: vi.fn(),
  goBack: vi.fn(),
  isLoading: false,
  invoice: { id: "inv_1" } as { id: string } | null,
}));

vi.mock("@/components/navigation/back-button", () => ({
  BackButton: ({ label }: { label: string }) => (
    <button type="button">{label}</button>
  ),
}));

vi.mock("@/hooks/use-back-navigation", () => ({
  useBackNavigation: () => invoiceEditMocks.goBack,
}));

vi.mock("@/features/invoices/hooks/use-invoice-edit-logic", async () => {
  const reactHookForm = await vi.importActual<typeof import("react-hook-form")>(
      "react-hook-form",
    );

  return {
    useInvoiceEditLogic: () => {
      const form = reactHookForm.useForm({
        defaultValues: {
          status: "PENDING",
          notes: "Existing note",
          items: [
            {
              description: "Procedure",
              quantity: 1,
              price: 1200,
              taxTreatment: "EXEMPT_HEALTHCARE",
              taxRate: 0,
              hsnCode: "",
            },
          ],
        },
      });
      const { fields, append, remove } = reactHookForm.useFieldArray({
        control: form.control,
        name: "items",
      });
      const items = reactHookForm.useWatch({
        control: form.control,
        name: "items",
      });
      const totalAmount = (items ?? []).reduce(
        (sum, item) => sum + Number(item.quantity || 0) * Number(item.price || 0),
        0,
      );

      return {
        form,
        fields,
        append,
        remove,
        onSubmit: invoiceEditMocks.onSubmit,
        invoice: invoiceEditMocks.invoice,
        isLoading: invoiceEditMocks.isLoading,
        totalAmount,
        router: { push: invoiceEditMocks.routerPush },
      };
    },
  };
});

describe("InvoiceEditUI", () => {
  beforeEach(() => {
    invoiceEditMocks.onSubmit.mockReset();
    invoiceEditMocks.routerPush.mockReset();
    invoiceEditMocks.goBack.mockReset();
    invoiceEditMocks.isLoading = false;
    invoiceEditMocks.invoice = { id: "inv_1" };
  });

  it("renders loading and not-found states", () => {
    invoiceEditMocks.isLoading = true;
    const { rerender } = renderWithIntl(<InvoiceEditUI invoiceId="inv_1" />);

    expect(screen.getByText("Loading invoice…")).toBeInTheDocument();

    invoiceEditMocks.isLoading = false;
    invoiceEditMocks.invoice = null;
    rerender(<InvoiceEditUI invoiceId="inv_1" key="not-found" />);

    expect(screen.getByText("Invoice not found")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back to Invoices" }));
    expect(invoiceEditMocks.routerPush).toHaveBeenCalledWith("/invoices");
  });

  it("edits invoice details, submits, and supports cancel", async () => {
    renderWithIntl(<InvoiceEditUI invoiceId="inv_1" />);

    expect(screen.getByRole("heading", { name: "Edit invoice" })).toBeInTheDocument();
    fireEvent.change(within(screen.getByRole("table")).getByDisplayValue("Procedure"), {
      target: { value: "Dental procedure" },
    });
    fireEvent.change(screen.getByPlaceholderText("Notes"), {
      target: { value: "Updated payment instructions." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Update Invoice" }));

    await waitFor(() => {
      expect(invoiceEditMocks.onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "PENDING",
          notes: "Updated payment instructions.",
          items: expect.arrayContaining([
            expect.objectContaining({
              description: "Dental procedure",
            }),
          ]),
        }),
        expect.anything(),
      );
    });

    fireEvent.click(screen.getAllByRole("button", { name: "Cancel" }).at(-1)!);
    expect(invoiceEditMocks.goBack).toHaveBeenCalled();
  });
});
