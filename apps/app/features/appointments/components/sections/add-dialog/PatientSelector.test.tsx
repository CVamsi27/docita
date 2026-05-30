import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form/form";
import type { CreateAppointmentInput, Patient } from "@workspace/types";
import { PatientSelector } from "./PatientSelector";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal("ResizeObserver", ResizeObserverMock);

if (!HTMLElement.prototype.scrollIntoView) {
  HTMLElement.prototype.scrollIntoView = () => {};
}

const patients: Patient[] = [
  {
    id: "patient-1",
    firstName: "Asha",
    lastName: "Rao",
    dateOfBirth: "1992-01-01",
    gender: "FEMALE",
    phoneNumber: "9999999991",
  },
  {
    id: "patient-2",
    firstName: "Neel",
    lastName: "Shah",
    dateOfBirth: "1990-01-01",
    gender: "MALE",
    phoneNumber: "9999999992",
  },
];

function TestForm({ prefilledPatientId }: { prefilledPatientId?: string }) {
  const form = useForm<CreateAppointmentInput>({
    defaultValues: {
      patientId: prefilledPatientId || "",
      doctorId: "doctor-1",
      clinicId: "clinic-1",
      startTime: "2026-03-31T10:00",
      endTime: "2026-03-31T10:30",
      status: "scheduled",
      type: "consultation",
      notes: "",
    },
  });
  const [patientSearch, setPatientSearch] = useState("");
  const [open, setOpen] = useState(false);

  return (
    <Form {...form}>
      <FormField
        control={form.control}
        name="patientId"
        render={({ field }) => (
          <FormItem className="min-w-0">
            <FormLabel>Patient</FormLabel>
            <PatientSelector
              value={field.value ?? ""}
              onChange={field.onChange}
              patients={patients}
              patientsLoading={false}
              patientSearch={patientSearch}
              setPatientSearch={setPatientSearch}
              patientComboboxOpen={open}
              setPatientComboboxOpen={setOpen}
            />
            <FormMessage />
          </FormItem>
        )}
      />
    </Form>
  );
}

describe("PatientSelector", () => {
  it("allows mouse selection in dialog-friendly popover mode", () => {
    render(<TestForm />);

    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getByText("Asha Rao"));

    expect(screen.getByRole("combobox")).toHaveTextContent("Asha Rao");
  });

  it("keeps prefilled patient editable", () => {
    render(<TestForm prefilledPatientId="patient-1" />);

    expect(screen.getByRole("combobox")).toHaveTextContent("Asha Rao");

    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getByText("Neel Shah"));

    expect(screen.getByRole("combobox")).toHaveTextContent("Neel Shah");
  });

  it("supports keyboard selection on patient options", () => {
    render(<TestForm />);

    fireEvent.click(screen.getByRole("combobox"));
    const searchInput = screen.getByPlaceholderText("Patient name");

    fireEvent.keyDown(searchInput, { key: "ArrowDown" });
    fireEvent.keyDown(searchInput, { key: "ArrowDown" });
    fireEvent.keyDown(searchInput, { key: "Enter" });

    expect(screen.getByRole("combobox")).toHaveTextContent("Neel Shah");
  });
});
