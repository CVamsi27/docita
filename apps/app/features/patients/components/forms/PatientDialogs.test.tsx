import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DPDP_NOTICE_VERSION } from "@workspace/types";
import { NextIntlClientProvider } from "next-intl";
import { AddPatientDialog, EditPatientDialog } from "./PatientDialogs";
import { useAddPatientDialog } from "./dialogs/use-add-patient-dialog";

const messages = {
  Patients: {
    addPatientDialog: {
      title: "Add New Patient",
      description: "Enter the patient's details to create their record",
    },
    editPatientDialog: {
      title: "Edit Patient",
      description: "Update the patient's information",
      verifyLabel: "Verify via OTP",
      saveSuccess: "Patient updated successfully",
      saveError: "We could not save this patient. Please try again.",
      validationError: "Please check the highlighted fields and try again.",
      abhaVerifiedBadge: "ABHA verified",
      abhaIdleHint: "Verify the ABHA address after saving or editing the value.",
    },
    abhaField: {
      label: "ABHA Address",
      labelAria: "ABHA Address (coming soon)",
      verifyLabel: "Verify",
      verifyAria: "{label} (coming soon)",
      verifiedBadge: "Verified",
      notConfiguredBadge: "Not configured",
      failedBadge: "Failed",
      unverifiedBadge: "Unverified",
      pendingTitle: "ABHA verification pending",
      verifiedDescription: "ABHA verification completed for this patient.",
    },
    abhaOtpDialog: {
      title: "Verify ABHA via OTP",
      mobileDescription: "Enter the patient's mobile number to receive an OTP for ABHA verification.",
      otpDescription: "Enter the OTP sent to the registered mobile.",
      mobileLabel: "Mobile number",
      mobilePlaceholder: "Enter 10-digit mobile number",
      otpLabel: "OTP",
      otpPlaceholder: "Enter the OTP",
      cancelButton: "Cancel",
      sendOtpButton: "Send OTP",
      backButton: "Back",
      verifyButton: "Verify",
    },
    patientForm: {
      firstNameLabel: "First Name",
      firstNamePlaceholder: "First name",
      lastNameLabel: "Last Name",
      lastNamePlaceholder: "Last name",
      phoneLabel: "Phone",
      phonePlaceholder: "Phone number",
      emailLabel: "Email",
      emailPlaceholder: "Email",
      genderLabel: "Gender",
      genderPlaceholder: "Gender",
      dateOfBirthLabel: "Date of Birth",
      dateOfBirthPlaceholder: "Date of birth",
      addPatientButton: "Add Patient",
      closeButton: "Close",
      cancelButton: "Cancel",
      dpdpCheckbox: "I confirm DPDP Act, 2023 consent has been obtained from the patient (or their authorised representative).",
    },
  },
};

function renderWithIntl(ui: React.ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

const createPatientMock = vi.fn();
const updatePatientMock = vi.fn();
const verifyAbhaMock = vi.fn();
const requestAbhaOtpMock = vi.fn();

vi.mock("@/lib/contexts/clinic-context", () => ({
  useClinic: () => ({
    clinic: { countryCode: "IN" },
  }),
}));

vi.mock("@workspace/data-access", () => ({
  useCreatePatient: () => ({
    mutateAsync: createPatientMock,
    isPending: false,
  }),
  useUpdatePatient: () => ({
    mutateAsync: updatePatientMock,
    isPending: false,
  }),
  useVerifyPatientAbha: () => ({
    mutateAsync: verifyAbhaMock,
    isPending: false,
  }),
  useRequestAbhaOtp: () => ({
    mutateAsync: requestAbhaOtpMock,
    isPending: false,
  }),
  useVerifyAbhaOtp: () => ({ mutateAsync: vi.fn(), isPending: false }),
  APIRequestError: class APIRequestError extends Error {},
}));

describe("AddPatientDialog", () => {
  beforeEach(() => {
    createPatientMock.mockReset();
    updatePatientMock.mockReset();
    verifyAbhaMock.mockReset();
    requestAbhaOtpMock.mockReset();
    createPatientMock.mockResolvedValue({
      id: "patient-1",
      clinicId: "clinic-1",
      firstName: "Asha",
      lastName: "Verma",
      phoneNumber: "9876543210",
      gender: "FEMALE",
      dateOfBirth: "1990-01-01",
      createdAt: "2026-06-11T00:00:00.000Z",
      updatedAt: "2026-06-11T00:00:00.000Z",
      version: 1,
    });
    updatePatientMock.mockResolvedValue({});
    verifyAbhaMock.mockResolvedValue({
      verified: true,
      abhaAddress: "asha.verma@abdm",
      abhaNumber: "12345678901234",
      kycName: "Asha Verma",
      verifiedAt: "2026-06-11T00:00:00.000Z",
      error: null,
    });
  });

  it("does not render when closed", () => {
    renderWithIntl(<AddPatientDialog open={false} />);

    expect(screen.queryByText("Add New Patient")).not.toBeInTheDocument();
  });

  it("renders form fields when open", () => {
    renderWithIntl(<AddPatientDialog open />);

    expect(screen.getByText("Add New Patient")).toBeInTheDocument();
    expect(screen.getByLabelText("First Name *")).toBeInTheDocument();
    expect(screen.getByLabelText("Last Name *")).toBeInTheDocument();
    expect(screen.getByLabelText("Phone")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(
      screen.getByLabelText("ABHA Address (coming soon)"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Gender *")).toBeInTheDocument();
    expect(screen.getByLabelText(/Date of Birth/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText("First name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Last name")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Phone number")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Email")).toBeInTheDocument();
  });

  it("updates first name input value", () => {
    renderWithIntl(<AddPatientDialog open />);

    const firstNameInput = screen.getByLabelText("First Name *");
    fireEvent.change(firstNameInput, { target: { value: "Asha" } });

    expect(firstNameInput).toHaveValue("Asha");
  });

  it("closes dialog when clicking cancel", () => {
    const onOpenChange = vi.fn();

    renderWithIntl(<AddPatientDialog open onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("verifies ABHA after creating a patient with an ABHA address", async () => {
    const { result } = renderHook(() => useAddPatientDialog({}));

    await act(async () => {
      result.current.form.setValue("firstName", "Asha");
      result.current.form.setValue("lastName", "Verma");
      result.current.form.setValue("phoneNumber", "9876543210");
      result.current.form.setValue("gender", "FEMALE");
      result.current.form.setValue("dateOfBirth", "1990-01-01");
      result.current.form.setValue("abhaAddress", "asha.verma@abdm");
      result.current.form.setValue("dpdpConsent", {
        accepted: true,
        noticeVersion: DPDP_NOTICE_VERSION,
        relation: "SELF",
      });
      await result.current.handleSubmit();
    });

    await waitFor(() => {
      expect(createPatientMock).toHaveBeenCalled();
      expect(verifyAbhaMock).toHaveBeenCalledWith({
        patientId: "patient-1",
        abhaAddress: "asha.verma@abdm",
      });
    });
  });
});

describe("EditPatientDialog", () => {
  beforeEach(() => {
    createPatientMock.mockReset();
    updatePatientMock.mockReset();
    requestAbhaOtpMock.mockReset();
    requestAbhaOtpMock.mockResolvedValue({
      txnId: "txn-1",
    });
  });

  it("shows the ABHA verify action as disabled while the feature is coming soon", () => {
    renderWithIntl(
      <EditPatientDialog
        open
        patient={{
          id: "patient-1",
          clinicId: "clinic-1",
          firstName: "Asha",
          lastName: "Verma",
          phoneNumber: "9876543210",
          gender: "FEMALE",
          dateOfBirth: "1990-01-01",
          abhaAddress: "asha.verma@abdm",
          createdAt: "2026-06-11T00:00:00.000Z",
          updatedAt: "2026-06-11T00:00:00.000Z",
          version: 1,
        }}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Verify via OTP (coming soon)" }),
    ).toBeDisabled();
    expect(requestAbhaOtpMock).not.toHaveBeenCalled();
  });
});
