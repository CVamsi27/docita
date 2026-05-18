import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TooltipProvider } from "@workspace/ui/components/overlay/tooltip";
import { EditClinicDialog } from "./edit-clinic-dialog";

function renderDialog(ui: ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>);
}

const apiMocks = vi.hoisted(() => ({
  patch: vi.fn(),
  toastSuccess: vi.fn(),
}));

vi.mock("@/lib/api/api-client", () => ({
  client: {
    patch: apiMocks.patch,
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

const clinic = {
  id: "clinic_1",
  name: "Care Clinic",
  email: "care@example.com",
  phone: "+919000000000",
  address: "12 Health Street",
  tier: "STARTER",
  type: "GENERAL",
  active: true,
};

describe("EditClinicDialog", () => {
  beforeEach(() => {
    apiMocks.patch.mockReset();
    apiMocks.toastSuccess.mockReset();
  });

  it("validates editable facility fields before saving", async () => {
    renderDialog(<EditClinicDialog clinic={clinic} onClinicUpdated={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "Edit facility" }));
    fireEvent.change(screen.getByLabelText("Facility Name"), {
      target: { value: "" },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "not-an-email" },
    });
    fireEvent.change(screen.getByLabelText("Address"), {
      target: { value: "" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Update Facility" }));

    expect(
      await screen.findByText("Enter the facility name"),
    ).toBeInTheDocument();
    expect(screen.getByText("Enter a valid email address")).toBeInTheDocument();
    expect(screen.getByText("Enter the facility address")).toBeInTheDocument();
    expect(apiMocks.patch).not.toHaveBeenCalled();
  });

  it("submits changed facility details and calls the refresh callback", async () => {
    apiMocks.patch.mockResolvedValue({});
    const onClinicUpdated = vi.fn();

    renderDialog(
      <EditClinicDialog
        clinic={clinic}
        onClinicUpdated={onClinicUpdated}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Edit facility" }));
    fireEvent.change(screen.getByLabelText("Facility Name"), {
      target: { value: "Care Clinic Plus" },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "plus@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Address"), {
      target: { value: "45 Updated Street" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Update Facility" }));

    await waitFor(() => {
      expect(apiMocks.patch).toHaveBeenCalledWith(
        "/internal/clinics/clinic_1",
        expect.objectContaining({
          name: "Care Clinic Plus",
          email: "plus@example.com",
          phone: "+919000000000",
          address: "45 Updated Street",
          tier: "STARTER",
          type: "GENERAL",
          active: true,
        }),
      );
    });
    expect(onClinicUpdated).toHaveBeenCalled();
    expect(apiMocks.toastSuccess).toHaveBeenCalledWith(
      "Facility updated successfully",
    );
  });
});
