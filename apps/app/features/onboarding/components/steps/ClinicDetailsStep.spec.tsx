import { render, screen } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import type { ClinicDetails } from "@/features/onboarding/components/types";
import { clinicDetailsSchema } from "@/features/onboarding/components/types";
import { ClinicDetailsStep } from "./ClinicDetailsStep";

const mocks = vi.hoisted(() => ({
  phoneInput: vi.fn(),
}));

vi.mock("react-phone-number-input", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("react-phone-number-input")>();

  return {
    ...actual,
    default: (props: Record<string, unknown>) => {
      mocks.phoneInput(props);
      return (
        <div
          data-testid="phone-input"
          data-default-country={String(props.defaultCountry ?? "")}
          className={String(props.className ?? "")}
        />
      );
    },
  };
});

vi.mock("@/features/onboarding/components/clinic-address-picker-dialog", () => ({
  ClinicAddressPickerDialog: () => <div data-testid="clinic-address-picker" />,
}));

function Harness({ countryCode = "US" }: { countryCode?: string }) {
  const clinicForm = useForm<ClinicDetails>({
    defaultValues: {
      name: "Clinic",
      email: "clinic@example.com",
      phone: "",
      addressLine1: "123 Medical Lane",
      addressLine2: "Suite 4",
      city: "Hyderabad",
      state: "Telangana",
      pincode: "500001",
      address: "123 Medical Lane, Suite 4, Hyderabad, Telangana, 500001, US",
      type: "GENERAL",
      facilityLabel: "CLINIC",
      countryCode,
      website: "",
      gstin: "",
    },
  });

  return <ClinicDetailsStep clinicForm={clinicForm} onSubmit={vi.fn()} />;
}

describe("clinicDetailsSchema", () => {
  it("validates required clinic details fields", () => {
    const result = clinicDetailsSchema.safeParse({
      name: "A",
      email: "",
      phone: "+447911123456",
      addressLine1: "123 Medical Lane",
      addressLine2: "",
      city: "London",
      state: "Greater London",
      pincode: "SW1A 1AA",
      address: "123 Medical Lane, London, Greater London, SW1A 1AA, GB",
      type: "GENERAL",
      facilityLabel: "CLINIC",
      countryCode: "GB",
      website: "",
      gstin: "",
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error("Expected validation to fail");
    }

    const messages = result.error.issues.map((issue) => issue.message);
    expect(messages).toContain("Use at least 2 characters");
    expect(messages).not.toContain("Please enter a valid email address");
  });

  it("allows an empty clinic email", () => {
    const result = clinicDetailsSchema.safeParse({
      name: "Clinic",
      email: "",
      phone: "+447911123456",
      addressLine1: "123 Medical Lane",
      addressLine2: "",
      city: "London",
      state: "Greater London",
      pincode: "SW1A 1AA",
      address: "123 Medical Lane, London, Greater London, SW1A 1AA, GB",
      type: "GENERAL",
      facilityLabel: "CLINIC",
      countryCode: "GB",
      website: "",
      gstin: "",
      mapsLocation: { lat: 51.5074, lng: -0.1278 },
    });

    expect(result.success).toBe(true);
  });

  it("validates phone numbers against the selected country", () => {
    const result = clinicDetailsSchema.safeParse({
      name: "Clinic",
      email: "",
      phone: "12345",
      addressLine1: "123 Medical Lane",
      addressLine2: "",
      city: "London",
      state: "Greater London",
      pincode: "SW1A 1AA",
      address: "123 Medical Lane, London, Greater London, SW1A 1AA, GB",
      type: "GENERAL",
      facilityLabel: "CLINIC",
      countryCode: "GB",
      website: "",
      gstin: "",
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error("Expected validation to fail");
    }

    const messages = result.error.issues.map((issue) => issue.message);
    expect(messages).toContain("Enter a valid phone number for GB");
  });

  it("rejects phone numbers that belong to a different country than selected", () => {
    const result = clinicDetailsSchema.safeParse({
      name: "Clinic",
      email: "",
      phone: "+919876543210",
      addressLine1: "123 Medical Lane",
      addressLine2: "",
      city: "London",
      state: "Greater London",
      pincode: "SW1A 1AA",
      address: "123 Medical Lane, London, Greater London, SW1A 1AA, GB",
      type: "GENERAL",
      facilityLabel: "CLINIC",
      countryCode: "GB",
      website: "",
      gstin: "",
    });

    expect(result.success).toBe(false);
    if (result.success) {
      throw new Error("Expected validation to fail");
    }

    const messages = result.error.issues.map((issue) => issue.message);
    expect(messages).toContain("Enter a valid phone number for GB");
  });
});

describe("ClinicDetailsStep", () => {
  it("uses the current clinic country as the phone default and keeps the input roomy", () => {
    render(<Harness countryCode="GB" />);

    const phoneInput = screen.getByTestId("phone-input");
    expect(phoneInput).toHaveAttribute("data-default-country", "GB");
    expect(phoneInput.className).toContain("min-w-0");
    expect(phoneInput.className).toContain("flex-col");
    expect(phoneInput.className).toContain("sm:flex-row");
    expect(screen.queryByText("Optional")).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText("Clinic name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText(/Address Line 1/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Postal Code \/ Pincode/i)).toBeInTheDocument();
  });
});
