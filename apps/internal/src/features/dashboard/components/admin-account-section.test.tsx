import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@/test-utils";
import { AdminAccountSection } from "./admin-account-section";
import type { CreateClinicFormData, FieldErrors } from "../hooks/create-clinic-form-helpers";

const defaultFormData: CreateClinicFormData = {
  name: "", email: "", phone: "", address: "",
  tier: "STARTER", type: "GENERAL",
  adminName: "", adminEmail: "", adminPassword: "", adminType: "admin",
};

const defaultFieldErrors: FieldErrors = {};

function renderSection(overrides?: {
  formData?: Partial<CreateClinicFormData>;
  fieldErrors?: FieldErrors;
  showPassword?: boolean;
}) {
  const formData = { ...defaultFormData, ...overrides?.formData };
  const onFieldChange = vi.fn();
  const onTogglePassword = vi.fn();

  render(
    <AdminAccountSection
      formData={formData}
      fieldErrors={overrides?.fieldErrors ?? defaultFieldErrors}
      showPassword={overrides?.showPassword ?? false}
      onFieldChange={onFieldChange}
      onTogglePassword={onTogglePassword}
    />,
  );

  return { onFieldChange, onTogglePassword };
}

describe("AdminAccountSection", () => {
  it("renders all form fields with correct labels", () => {
    renderSection();
    expect(screen.getByLabelText("Admin Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Admin Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByText("Admin Type *")).toBeInTheDocument();
  });

  it("displays provided form data values", () => {
    renderSection({
      formData: {
        adminName: "John Doe",
        adminEmail: "john@example.com",
        adminPassword: "secret123",
      },
    });

    expect(screen.getByDisplayValue("John Doe")).toBeInTheDocument();
    expect(screen.getByDisplayValue("john@example.com")).toBeInTheDocument();
    expect(screen.getByDisplayValue("secret123")).toBeInTheDocument();
  });

  it("calls onFieldChange when name input changes", () => {
    const { onFieldChange } = renderSection();
    const input = screen.getByLabelText("Admin Name");
    fireEvent.change(input, { target: { value: "Jane" } });
    expect(onFieldChange).toHaveBeenCalledWith("adminName", "Jane");
  });

  it("calls onFieldChange when email input changes", () => {
    const { onFieldChange } = renderSection();
    const input = screen.getByLabelText("Admin Email");
    fireEvent.change(input, { target: { value: "jane@test.com" } });
    expect(onFieldChange).toHaveBeenCalledWith("adminEmail", "jane@test.com");
  });

  it("calls onFieldChange when password input changes", () => {
    const { onFieldChange } = renderSection();
    const input = screen.getByLabelText("Password");
    fireEvent.change(input, { target: { value: "newpass" } });
    expect(onFieldChange).toHaveBeenCalledWith("adminPassword", "newpass");
  });

  it("shows password when showPassword is true", () => {
    renderSection({ showPassword: true });
    const passwordInput = screen.getByLabelText("Password") as HTMLInputElement;
    expect(passwordInput.type).toBe("text");
  });

  it("hides password when showPassword is false", () => {
    renderSection({ showPassword: false });
    const passwordInput = screen.getByLabelText("Password") as HTMLInputElement;
    expect(passwordInput.type).toBe("password");
  });

  it("calls onTogglePassword when eye icon button is clicked", () => {
    const { onTogglePassword } = renderSection();
    const toggleButton = screen.getByRole("button", { name: "" });
    fireEvent.click(toggleButton);
    expect(onTogglePassword).toHaveBeenCalledTimes(1);
  });

  it("displays field error messages", () => {
    const fieldErrors: FieldErrors = {
      adminName: "Enter the admin's name",
      adminEmail: "Enter a valid admin email address",
      adminPassword: "Enter a password for the admin",
    };
    renderSection({ fieldErrors });

    expect(screen.getByText("Enter the admin's name")).toBeInTheDocument();
    expect(screen.getByText("Enter a valid admin email address")).toBeInTheDocument();
    expect(screen.getByText("Enter a password for the admin")).toBeInTheDocument();
  });

  it("marks inputs as invalid when errors exist", () => {
    const fieldErrors: FieldErrors = {
      adminName: "Required",
    };
    renderSection({ fieldErrors });

    const input = screen.getByLabelText("Admin Name");
    expect(input).toHaveAttribute("aria-invalid", "true");
  });

  it("does not mark inputs as invalid without errors", () => {
    renderSection();
    const input = screen.getByLabelText("Admin Name");
    expect(input).toHaveAttribute("aria-invalid", "false");
  });

  it("renders section heading", () => {
    renderSection();
    expect(screen.getByText("Admin Account")).toBeInTheDocument();
  });
});
