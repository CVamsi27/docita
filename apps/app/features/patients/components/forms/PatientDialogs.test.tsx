import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AddPatientDialog } from "./PatientDialogs";

vi.mock("@/lib/clinic-context", () => ({
  useClinic: () => ({
    clinic: { countryCode: "IN" },
  }),
}));

vi.mock("@/hooks/api/use-patients", () => ({
  useCreatePatient: () => ({
    mutateAsync: vi.fn().mockResolvedValue(undefined),
    isPending: false,
  }),
  useUpdatePatient: () => ({
    mutateAsync: vi.fn().mockResolvedValue(undefined),
    isPending: false,
  }),
}));

describe("AddPatientDialog", () => {
  it("does not render when closed", () => {
    render(<AddPatientDialog open={false} />);

    expect(screen.queryByText("Add New Patient")).not.toBeInTheDocument();
  });

  it("renders form fields when open", () => {
    render(<AddPatientDialog open />);

    expect(screen.getByText("Add New Patient")).toBeInTheDocument();
    expect(screen.getByLabelText("First Name *")).toBeInTheDocument();
    expect(screen.getByLabelText("Last Name *")).toBeInTheDocument();
    expect(screen.getByLabelText("Phone")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Gender *")).toBeInTheDocument();
    expect(screen.getByLabelText(/Date of Birth/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText("First name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Last name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Phone number")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Email")).toBeInTheDocument();
  });

  it("updates first name input value", () => {
    render(<AddPatientDialog open />);

    const firstNameInput = screen.getByLabelText("First Name *");
    fireEvent.change(firstNameInput, { target: { value: "Asha" } });

    expect(firstNameInput).toHaveValue("Asha");
  });

  it("closes dialog when clicking cancel", () => {
    const onOpenChange = vi.fn();

    render(<AddPatientDialog open onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
