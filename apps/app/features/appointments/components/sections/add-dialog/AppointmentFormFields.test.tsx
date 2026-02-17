import { fireEvent, render, screen } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";
import { Form } from "@workspace/ui/components/form";
import type { CreateAppointmentInput } from "@workspace/types";
import { AppointmentFormFields } from "./AppointmentFormFields";

function TestForm() {
  const form = useForm<CreateAppointmentInput>({
    defaultValues: {
      type: "consultation",
      notes: "",
    },
  });

  return (
    <Form {...form}>
      <AppointmentFormFields
        form={form}
        appointmentTypeOptions={[
          { label: "Consultation", value: "consultation" },
          { label: "Follow-up", value: "follow-up" },
        ]}
      />
    </Form>
  );
}

describe("AppointmentFormFields", () => {
  it("renders type and notes fields", () => {
    render(<TestForm />);

    expect(screen.getByText("Type")).toBeInTheDocument();
    expect(screen.getByText("Notes")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText("Add any additional notes...")
    ).toBeInTheDocument();
  });

  it("updates notes value", () => {
    render(<TestForm />);

    const notesInput = screen.getByPlaceholderText("Add any additional notes...");
    fireEvent.change(notesInput, { target: { value: "Patient requested evening slot" } });

    expect(notesInput).toHaveValue("Patient requested evening slot");
  });
});