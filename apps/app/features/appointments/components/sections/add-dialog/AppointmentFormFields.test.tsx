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
      <button
        type="button"
        onClick={() =>
          form.setError("notes", {
            type: "manual",
            message: "Notes are required",
          })
        }
      >
        Trigger Notes Error
      </button>
    </Form>
  );
}

function TestFormWithoutInitialType() {
  const form = useForm<CreateAppointmentInput>({
    defaultValues: {
      notes: "",
    } as CreateAppointmentInput,
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

const NOTES_PLACEHOLDER = "Visit notes";

describe("AppointmentFormFields", () => {
  it("renders type and notes fields", () => {
    render(<TestForm />);

    expect(screen.getByText("Type")).toBeInTheDocument();
    expect(screen.getByText("Notes (optional)")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(NOTES_PLACEHOLDER)).toBeInTheDocument();
  });

  it("updates notes value", () => {
    render(<TestForm />);

    const notesInput = screen.getByPlaceholderText(NOTES_PLACEHOLDER);
    fireEvent.change(notesInput, {
      target: { value: "Patient requested evening slot" },
    });

    expect(notesInput).toHaveValue("Patient requested evening slot");
  });

  it("shows field-level validation state and message when notes has an error", () => {
    render(<TestForm />);

    fireEvent.click(
      screen.getByRole("button", { name: "Trigger Notes Error" }),
    );

    const notesInput = screen.getByPlaceholderText(NOTES_PLACEHOLDER);
    expect(notesInput).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Notes are required")).toBeInTheDocument();
  });

  it("renders safely when appointment type is initially undefined", () => {
    render(<TestFormWithoutInitialType />);

    expect(screen.getByText("Type")).toBeInTheDocument();
    expect(screen.getByText("Notes (optional)")).toBeInTheDocument();
  });
});
