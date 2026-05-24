import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreateClinicDialog } from "./create-clinic-dialog";

const apiMocks = vi.hoisted(() => ({
  post: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("@/lib/api/api-client", () => ({
  client: {
    post: apiMocks.post,
  },
}));

vi.mock("@/lib/errors/user-facing-errors", () => ({
  showUserFacingErrorToast: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: apiMocks.toastSuccess,
  },
}));

describe("CreateClinicDialog", () => {
  beforeEach(() => {
    apiMocks.post.mockReset();
    apiMocks.toastSuccess.mockReset();
  });

  it("validates facility and admin fields before creating a facility", async () => {
    render(<CreateClinicDialog onClinicCreated={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Add Facility" }));
    fireEvent.click(screen.getByRole("button", { name: "Create Facility" }));

    expect(await screen.findByText("Enter the facility name")).toBeInTheDocument();
    expect(screen.getByText("Enter the admin's name")).toBeInTheDocument();
    expect(apiMocks.post).not.toHaveBeenCalled();
  });

  it("submits a complete facility payload and resets after success", async () => {
    apiMocks.post.mockResolvedValue({});
    const onClinicCreated = vi.fn();

    render(<CreateClinicDialog onClinicCreated={onClinicCreated} />);

    fireEvent.click(screen.getByRole("button", { name: "Add Facility" }));
    fireEvent.change(screen.getByLabelText("Facility name"), {
      target: { value: "North Care Facility" },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "north@example.com" },
    });
    fireEvent.change(screen.getByPlaceholderText("Enter phone number"), {
      target: { value: "+919000000001" },
    });
    fireEvent.change(screen.getByLabelText("Address"), {
      target: { value: "45 North Street" },
    });
    fireEvent.change(screen.getByLabelText("Admin name"), {
      target: { value: "Admin User" },
    });
    fireEvent.change(screen.getByLabelText("Admin email"), {
      target: { value: "admin@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "Admin@123456" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Create Facility" }));

    await waitFor(() => {
      expect(apiMocks.post).toHaveBeenCalledWith(
        "/internal/clinics",
        expect.objectContaining({
          name: "North Care Facility",
          email: "north@example.com",
          phone: "+919000000001",
          address: "45 North Street",
          adminName: "Admin User",
          adminEmail: "admin@example.com",
          adminPassword: "Admin@123456",
          tier: "STARTER",
          type: "GENERAL",
        }),
      );
    });
    expect(onClinicCreated).toHaveBeenCalled();
    expect(apiMocks.toastSuccess).toHaveBeenCalledWith(
      "Facility created successfully",
    );
  });
});
