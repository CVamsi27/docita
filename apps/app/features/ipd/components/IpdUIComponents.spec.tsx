import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdmissionForm } from "./IpdUIComponents";

describe("AdmissionForm", () => {
  it("shows field-level validation messages for each violated field on submit", () => {
    const onSubmit = vi.fn();
    render(<AdmissionForm onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole("button", { name: "Admit Patient" }));

    expect(screen.getByText("Patient is required")).toBeInTheDocument();
    expect(screen.getByText("Ward is required")).toBeInTheDocument();
    expect(screen.getByText("Bed is required")).toBeInTheDocument();
    expect(screen.getByText("Attending doctor is required")).toBeInTheDocument();
    expect(screen.getByText("Admission diagnosis is required")).toBeInTheDocument();

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits when required fields are valid", () => {
    const onSubmit = vi.fn();
    render(<AdmissionForm onSubmit={onSubmit} />);

    fireEvent.change(
      screen.getByPlaceholderText("Search patient by name or phone..."),
      { target: { value: "Patient One" } },
    );
    fireEvent.change(screen.getByDisplayValue("Select Ward"), {
      target: { value: "general" },
    });
    fireEvent.change(screen.getByDisplayValue("Select Bed"), {
      target: { value: "bed-1" },
    });
    fireEvent.change(screen.getByDisplayValue("Select Doctor"), {
      target: { value: "dr1" },
    });
    fireEvent.change(
      screen.getByPlaceholderText("Primary diagnosis for admission..."),
      { target: { value: "Fever with dehydration" } },
    );

    fireEvent.click(screen.getByRole("button", { name: "Admit Patient" }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        patientId: "Patient One",
        wardId: "general",
        bedId: "bed-1",
        attendingDoctorId: "dr1",
        diagnosis: "Fever with dehydration",
      }),
    );
  });
});
