import { fireEvent, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { render } from "@/test-utils/render-with-tooltip";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClinicGeneralSettings } from "./ClinicGeneralSettings";

// Minimal message namespace the clinic-settings form sections need.
// Keys are placeholders — the tests only assert on form labels / buttons
// that already exist in the production en.json.
const messages = {
  ClinicSettings: {
    general: {
      identityEyebrow: "Identity",
      nameLabel: "{facilityLabel} name",
      namePlaceholder: "Enter {facilityLabel} name",
      facilityTypeLabel: "Facility type",
      facilityTypeHint: "Used in navigation, headings, and join flows.",
      facilityTypePlaceholder: "Clinic or Hospital",
      facilityTypeClinic: "Clinic",
      facilityTypeHospital: "Hospital",
      locationEyebrow: "Location",
      addressLabel: "Address",
      addressPlaceholder: "Enter address",
      mapsLinkLabel: "Google Maps link",
      mapsLinkHint: "Paste a Google Maps URL or Plus code.",
      mapsLinkPlaceholder: "https://maps.google.com/...",
      previewLinkLabel: "Preview link",
      contactComplianceEyebrow: "Contact & compliance",
      phoneLabel: "Phone number",
      phonePlaceholder: "Enter phone number",
      gstinLabel: "GSTIN",
      gstinHint: "Needed for GST invoices.",
      gstinPlaceholder: "GST number",
      hfrFacilityIdLabel: "HFR Facility ID",
      hfrFacilityIdHint: "Required before ABDM production use.",
      hfrFacilityIdPlaceholder: "Enter HFR Facility ID",
      legalNameLabel: "Legal name",
      legalNameHint: "Registered legal name.",
      legalNamePlaceholder: "Legal name",
      cancelButton: "Cancel",
      savingButton: "Saving…",
      saveButton: "Save changes",
      abdmSectionEyebrow: "ABDM",
      abdmEnabledLabel: "Enable ABDM",
      abdmEnabledHint: "Allow ABHA linkage.",
      referralCodeLabel: "Staff join code",
      copyJoinCodeLabel: "Copy staff join code",
      copiedJoinCodeLabel: "Copied!",
    },
  },
  Common: {
    cancel: "Cancel",
    save: "Save",
  },
};

function renderWithIntl(node: ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {node}
    </NextIntlClientProvider>,
  );
}

const settingsMocks = vi.hoisted(() => ({
  updateClinic: vi.fn(),
  writeText: vi.fn(),
  clinic: {
    name: "Care Clinic",
    address: "12 Health Street",
    phone: "+919000000000",
    gstin: "",
    hfrFacilityId: "HFR-123",
    referralCode: "DOCITA123",
    settings: { facilityLabel: "CLINIC" },
  },
}));

const messages = {
  ClinicSettings: {
    general: {
      identityEyebrow: "Identity",
      nameLabel: "Clinic name",
      namePlaceholder: "Enter clinic name",
      facilityTypeLabel: "Facility type",
      facilityTypeHint: "Used in navigation, headings, and join flows.",
      facilityTypePlaceholder: "Clinic or Hospital",
      facilityTypeClinic: "Clinic",
      facilityTypeHospital: "Hospital",
      locationEyebrow: "Location",
      addressLabel: "Address",
      addressPlaceholder: "Enter address",
      mapsLinkLabel: "Google Maps link",
      mapsLinkHint:
        "Patients see this in appointment messages. Paste a Google Maps share URL or Plus code link. Leave blank to skip.",
      mapsLinkPlaceholder: "https://maps.google.com/...",
      previewLinkLabel: "Preview link",
      contactComplianceEyebrow: "Contact & compliance",
      phoneLabel: "Phone number",
      phonePlaceholder: "Enter phone number",
      gstinLabel: "GSTIN",
      gstinHint: "Needed for GST invoices on paid Indian plans.",
      gstinPlaceholder: "GST number",
      hfrFacilityIdLabel: "HFR Facility ID",
      hfrFacilityIdHint:
        "Required before production ABDM M1/M2 use for this facility.",
      hfrFacilityIdPlaceholder: "Enter HFR Facility ID",
      legalNameLabel: "Legal name (for tax invoice)",
      legalNameHint:
        "Registered legal name on your GST certificate. Leave blank to use the facility name.",
      legalNamePlaceholder: "e.g. Apollo Multispecialty Pvt. Ltd.",
      cancelButton: "Cancel",
      savingButton: "Saving…",
      saveButton: "Save changes",
    },
  },
};

vi.mock("@workspace/data-access", async () => {
  const actual = await vi.importActual<typeof import("@workspace/data-access")>(
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
    render(<ClinicGeneralSettings />, { messages });

    expect(screen.getByDisplayValue("Care Clinic")).toBeInTheDocument();
    expect(screen.getByDisplayValue("HFR-123")).toBeInTheDocument();
    expect(screen.getByText("DOCITA123")).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: "Copy staff join code" }),
    );

    await waitFor(() => {
      expect(settingsMocks.writeText).toHaveBeenCalledWith("DOCITA123");
    });
  });

  it("validates required fields and submits changed clinic settings", async () => {
    render(<ClinicGeneralSettings />, { messages });

    const nameInput = screen.getByDisplayValue("Care Clinic");
    fireEvent.change(nameInput, { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Enter facility name.")).toBeInTheDocument();
    expect(settingsMocks.updateClinic).not.toHaveBeenCalled();

    fireEvent.change(nameInput, { target: { value: "Care Clinic Plus" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => {
      expect(settingsMocks.updateClinic).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Care Clinic Plus",
          address: "12 Health Street",
          phone: "+919000000000",
          facilityLabel: "CLINIC",
          hfrFacilityId: "HFR-123",
        }),
        expect.objectContaining({
          onSuccess: expect.any(Function),
          onError: expect.any(Function),
        }),
      );
    });
  });
});
