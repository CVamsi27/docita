import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import type { LabTest, Patient } from "@workspace/types";
import { createLabTestOrderFormSchema, type CreateLabTestOrderFormValues } from "@workspace/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { OrderLabTestDialog } from "./OrderLabTestDialog";

vi.mock("@/hooks/use-clinic-currency", () => ({
  useClinicCurrency: () => ({
    formatCurrency: (amount: number) => `₹${amount}`,
  }),
}));

vi.mock("@workspace/data-access", () => ({
  useLabs: () => ({ data: [] }),
}));

const patient = {
  id: "patient_1",
  firstName: "Asha",
  lastName: "Rao",
  phoneNumber: "9000000000",
} as Patient;

const labTest = {
  id: "lab_1",
  name: "Complete Blood Count",
  category: "Hematology",
  price: 500,
} as LabTest;

function TestDialog({
  onSubmit = vi.fn(),
  defaultValues,
}: {
  onSubmit?: (data: CreateLabTestOrderFormValues) => void;
  defaultValues?: Partial<CreateLabTestOrderFormValues>;
}) {
  const form = useForm<CreateLabTestOrderFormValues>({
    resolver: zodResolver(createLabTestOrderFormSchema),
    defaultValues: {
      patientId: "",
      labTestId: "",
      notes: "",
      ...defaultValues,
    },
  });

  const selectedPatient = [patient].find((p) => p.id === form.watch("patientId"));
  const selectedTest = [labTest].find((test) => test.id === form.watch("labTestId"));

  return (
    <OrderLabTestDialog
      open
      onOpenChange={vi.fn()}
      form={form}
      onSubmit={onSubmit}
      isCreating={false}
      patients={[patient]}
      patientsLoading={false}
      testCatalog={[labTest]}
      catalogLoading={false}
      patientSearch=""
      setPatientSearch={vi.fn()}
      testSearch=""
      setTestSearch={vi.fn()}
      patientComboboxOpen={false}
      setPatientComboboxOpen={vi.fn()}
      testComboboxOpen={false}
      setTestComboboxOpen={vi.fn()}
      selectedPatient={selectedPatient}
      selectedTest={selectedTest}
    />
  );
}

describe("OrderLabTestDialog", () => {
  it("requires both patient and test before creating an order", async () => {
    const onSubmit = vi.fn();

    render(<TestDialog onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole("button", { name: "Order Test" }));

    expect(await screen.findByText("Select a patient")).toBeInTheDocument();
    expect(screen.getByText("Select a test")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits selected patient, test, and notes", async () => {
    const onSubmit = vi.fn();

    render(
      <TestDialog
        onSubmit={onSubmit}
        defaultValues={{
          patientId: "patient_1",
          labTestId: "lab_1",
          notes: "",
        }}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("Enter lab notes"), {
      target: { value: "Fasting sample preferred" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Order Test" }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled();
    });
    expect(onSubmit.mock.calls[0]?.[0]).toEqual({
      patientId: "patient_1",
      labTestId: "lab_1",
      notes: "Fasting sample preferred",
    });
  });
});
