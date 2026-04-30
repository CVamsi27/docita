import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { InvoiceCreateUI } from "./InvoiceCreateUI";

const invoiceCreateMocks = vi.hoisted(() => ({
  onSubmit: vi.fn(),
  routerPush: vi.fn(),
}));

vi.mock("@/components/common/navigation/back-button", () => ({
  BackButton: ({ label }: { label: string }) => (
    <button type="button">{label}</button>
  ),
}));

vi.mock("@/features/appointments/components/sections/add-dialog/PatientSelector", () => ({
  PatientSelector: ({
    form,
  }: {
    form: { setValue: (name: "patientId", value: string) => void };
  }) => (
    <button
      type="button"
      onClick={() => form.setValue("patientId", "patient_1")}
    >
      Select Test Patient
    </button>
  ),
}));

vi.mock("@/features/invoices/hooks/use-invoice-create-logic", async () => {
  const reactHookForm =
    await vi.importActual<typeof import("react-hook-form")>(
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
  beforeEach(() => {
    invoiceCreateMocks.onSubmit.mockReset();
    invoiceCreateMocks.routerPush.mockReset();
  });

  it("edits invoice line items and submits the form", async () => {
    render(<InvoiceCreateUI />);

    expect(screen.getByRole("heading", { name: "New Invoice" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Consultation")).toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue("Consultation"), {
      target: { value: "Follow-up consultation" },
    });
    fireEvent.change(screen.getByDisplayValue("500"), {
      target: { value: "750" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter notes..."), {
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
    render(<InvoiceCreateUI />);

    fireEvent.click(screen.getByRole("button", { name: "Add Item" }));
    expect(screen.getAllByPlaceholderText("Item description")).toHaveLength(2);

    fireEvent.click(screen.getAllByRole("button", { name: "Cancel" }).at(-1)!);
    expect(invoiceCreateMocks.routerPush).toHaveBeenCalledWith("/invoices");
  });
});
