import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { render } from "@/test-utils/render-with-tooltip";
import { describe, expect, it, vi, beforeEach } from "vitest";
import type { ReactElement } from "react";
import { InvoiceCreateUI } from "./InvoiceCreateUI";

/**
 * Local messages mirror covering all namespaces read by
 * InvoiceCreateUI + its child components. The test renders
 * InvoiceCreateUI via NextIntlClientProvider so useTranslations
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

vi.mock("@/components/auth/feature-gate", () => ({
  FeatureGate: ({ children }: { children: ReactElement }) => children,
}));

const invoiceCreateMocks = vi.hoisted(() => ({
  onSubmit: vi.fn(),
  routerPush: vi.fn(),
}));

vi.mock("@/components/navigation/back-button", () => ({
  BackButton: ({ label }: { label: string }) => (
    <button type="button">{label}</button>
  ),
}));

vi.mock("@/features/appointments/components/sections/add-dialog/PatientSelector", () => ({
  PatientSelector: ({ onChange }: { onChange: (patientId: string) => void }) => (
    <button type="button" onClick={() => onChange("patient_1")}>
      Select Test Patient
    </button>
  ),
}));

vi.mock("@/features/invoices/hooks/use-invoice-create-logic", async () => {
  const reactHookForm = await vi.importActual<typeof import("react-hook-form")>(
      "react-hook-form",
    );

  return {
    useInvoiceCreateLogic: () => {
      const form = reactHookForm.useForm({
        defaultValues: {
          patientId: "patient_1",
          status: "PENDING",
          notes: "",
          items: [
            {
              description: "Consultation",
              quantity: 1,
              price: 500,
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
        onSubmit: invoiceCreateMocks.onSubmit,
        totalAmount,
        router: { push: invoiceCreateMocks.routerPush },
        patients: [{ id: "patient_1", firstName: "Asha", lastName: "Rao" }],
        patientsLoading: false,
        patientSearch: "",
        setPatientSearch: vi.fn(),
        patientComboboxOpen: false,
        setPatientComboboxOpen: vi.fn(),
      };
    },
  };
});

describe("InvoiceCreateUI", () => {
  const desktopTable = () => screen.getByRole("table");

  beforeEach(() => {
    invoiceCreateMocks.onSubmit.mockReset();
    invoiceCreateMocks.routerPush.mockReset();
  });

  it("edits invoice line items and submits the form", async () => {
    renderWithIntl(<InvoiceCreateUI />);

    expect(screen.getByRole("heading", { name: "New invoice" })).toBeInTheDocument();
    expect(within(desktopTable()).getByDisplayValue("Consultation")).toBeInTheDocument();

    fireEvent.change(within(desktopTable()).getByDisplayValue("Consultation"), {
      target: { value: "Follow-up consultation" },
    });
    fireEvent.change(within(desktopTable()).getByDisplayValue("500"), {
      target: { value: "750" },
    });
    fireEvent.change(screen.getByPlaceholderText("Notes"), {
      target: { value: "Pay within seven days." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save Invoice" }));

    await waitFor(() => {
      expect(invoiceCreateMocks.onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          patientId: "patient_1",
          status: "PENDING",
          notes: "Pay within seven days.",
          items: expect.arrayContaining([
            expect.objectContaining({
              description: "Follow-up consultation",
              price: 750,
            }),
          ]),
        }),
        expect.anything(),
      );
    });
  });

  it("adds a blank item and returns to the invoice list on cancel", () => {
    renderWithIntl(<InvoiceCreateUI />);

    fireEvent.click(screen.getByRole("button", { name: "Add Item" }));
    expect(within(desktopTable()).getAllByPlaceholderText("Item description")).toHaveLength(2);

    fireEvent.click(screen.getAllByRole("button", { name: "Cancel" }).at(-1)!);
    expect(invoiceCreateMocks.routerPush).toHaveBeenCalledWith("/invoices");
  });
});
