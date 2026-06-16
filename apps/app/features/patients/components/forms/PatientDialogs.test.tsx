import {
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DPDP_NOTICE_VERSION } from "@workspace/types";
import { AddPatientDialog, EditPatientDialog } from "./PatientDialogs";
import { useAddPatientDialog } from "./dialogs/use-add-patient-dialog";

const createPatientMock = vi.fn();
const updatePatientMock = vi.fn();
const verifyAbhaMock = vi.fn();
const searchAbhaMock = vi.fn();

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
  useSearchAbhaByMobile: () => ({
    mutateAsync: searchAbhaMock,
    isPending: false,
  }),
  useRequestAbhaOtp: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useVerifyAbhaOtp: () => ({ mutateAsync: vi.fn(), isPending: false }),
  APIRequestError: class APIRequestError extends Error {},
}));

describe("AddPatientDialog", () => {
  beforeEach(() => {
    createPatientMock.mockReset();
    updatePatientMock.mockReset();
    verifyAbhaMock.mockReset();
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
    expect(screen.getByLabelText("ABHA Address")).toBeInTheDocument();
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
    searchAbhaMock.mockReset();
    searchAbhaMock.mockResolvedValue({
      txnId: "txn-1",
      accounts: [
        {
          index: 1,
          abhaNumber: "xx-xxxx-xxxx-0624",
          name: "Asha Verma",
          gender: "F",
          authMethods: ["MOBILE_OTP"],
        },
      ],
    });
  });

  it("opens the OTP verification flow and searches by mobile", async () => {
    render(
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

    fireEvent.click(screen.getByRole("button", { name: "Verify via OTP" }));

    // Step 1: the OTP dialog opens with a mobile-number input.
    const mobileInput = await screen.findByLabelText("Mobile number");
    fireEvent.change(mobileInput, { target: { value: "9876543210" } });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    await waitFor(() => {
      expect(searchAbhaMock).toHaveBeenCalledWith({
        patientId: "patient-1",
        mobile: "9876543210",
      });
    });

    // Step 2: the discovered ABHA account is listed for selection.
    expect(
      await screen.findByText(/xx-xxxx-xxxx-0624/),
    ).toBeInTheDocument();
  });
});
