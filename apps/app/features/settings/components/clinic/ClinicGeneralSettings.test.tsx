import { fireEvent, screen, waitFor } from "@testing-library/react";
import { render } from "@/test-utils/render-with-tooltip";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClinicGeneralSettings } from "./ClinicGeneralSettings";

const settingsMocks = vi.hoisted(() => ({
  updateClinic: vi.fn(),
  writeText: vi.fn(),
  clinic: {
    name: "Care Clinic",
    address: "12 Health Street",
    phone: "+919000000000",
    gstin: "",
    referralCode: "DOCITA123",
    settings: { facilityLabel: "CLINIC" },
  },
}));

vi.mock("@workspace/data-access", async () => {
  const actual =
    await vi.importActual<typeof import("@workspace/data-access")>(
      "@workspace/data-access",
    );
  return {
    ...actual,
    useClinicSettings: () => ({
      isLoading: false,
      data: settingsMocks.clinic,
    }),
    useUpdateClinicSettings: () => ({
      mutate: settingsMocks.updateClinic,
      isPending: false,
    }),
  };
});

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
  },
}));

vi.mock("@/features/settings/components/settings-ai-chips", () => ({
  SettingsAiChips: () => null,
}));

vi.mock("@workspace/ui/components/form/select", () => ({
  Select: ({
    children,
  }: {
    children: ReactNode;
    value?: string;
    onValueChange?: (value: string) => void;
  }) => <div>{children}</div>,
  SelectContent: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  SelectItem: ({
    children,
    value: _value,
  }: {
    children: ReactNode;
    value: string;
  }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: ReactNode }) => (
    <button type="button">{children}</button>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <span>{placeholder}</span>
  ),
}));

describe("ClinicGeneralSettings", () => {
  beforeEach(() => {
    settingsMocks.updateClinic.mockReset();
    settingsMocks.writeText.mockReset().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: settingsMocks.writeText },
    });
  });

  it("renders saved clinic values and copies the join code", async () => {
    render(<ClinicGeneralSettings />);

    expect(screen.getByDisplayValue("Care Clinic")).toBeInTheDocument();
    expect(screen.getByText("DOCITA123")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Copy staff join code" }));

    await waitFor(() => {
      expect(settingsMocks.writeText).toHaveBeenCalledWith("DOCITA123");
    });
  });

  it("validates required fields and submits changed clinic settings", async () => {
    render(<ClinicGeneralSettings />);

    const nameInput = screen.getByDisplayValue("Care Clinic");
    fireEvent.change(nameInput, { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    expect(await screen.findByText("Enter facility name.")).toBeInTheDocument();
    expect(settingsMocks.updateClinic).not.toHaveBeenCalled();

    fireEvent.change(nameInput, { target: { value: "Care Clinic Plus" } });
    fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));

    await waitFor(() => {
      expect(settingsMocks.updateClinic).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Care Clinic Plus",
          address: "12 Health Street",
          phone: "+919000000000",
          facilityLabel: "CLINIC",
        }),
        expect.objectContaining({
          onSuccess: expect.any(Function),
          onError: expect.any(Function),
        }),
      );
    });
  });
});
