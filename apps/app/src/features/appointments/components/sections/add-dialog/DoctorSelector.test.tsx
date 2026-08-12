import { render, screen } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";
import { Form } from "@workspace/ui/components/form/form";
import type { CreateAppointmentInput, Doctor } from "@workspace/types";
import { DoctorSelector } from "./DoctorSelector";

const doctors: Doctor[] = [
  {
    id: "doc_1",
    name: "Dr. Alice",
    email: "alice@example.com",
    phoneNumber: null,
    role: "DOCTOR",
    clinicId: "clinic_1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
] as Doctor[];

function TestFormWithoutInitialDoctor() {
  const form = useForm<CreateAppointmentInput>({
    defaultValues: {
      type: "consultation",
      notes: "",
    } as CreateAppointmentInput,
  });

  return (
    <Form {...form}>
      <DoctorSelector form={form} doctors={doctors} doctorsLoading={false} />
    </Form>
  );
}

describe("DoctorSelector", () => {
  it("renders safely when doctorId is initially undefined", () => {
    render(<TestFormWithoutInitialDoctor />);

    expect(screen.getByRole("combobox")).toHaveTextContent("Doctor");
  });
});
