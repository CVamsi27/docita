import { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/user-facing-errors", () => ({
  showUserFacingErrorToast: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("./use-patients", () => ({
  usePatient: vi.fn(() => ({
    data: { id: "patient-123", firstName: "Test", lastName: "Patient" },
    isLoading: false,
    isError: false,
  })),
  useUpdatePatient: vi.fn(() => ({ mutate: vi.fn() })),
}));

vi.mock("@/lib/api-core", () => ({
  useAPIQuery: vi.fn(() => ({
    data: {
      conditions: [],
      allergies: [
        {
          id: "allergy-1",
          patientId: "patient-123",
          allergen: "Peanuts",
          allergyType: "FOOD",
          severity: "SEVERE",
          isVerified: false,
        },
      ],
      familyHistory: [],
      socialHistory: null,
      surgicalHistory: [],
    },
    isLoading: false,
    isError: false,
  })),
}));

const createConditionSpy = vi
  .fn()
  .mockResolvedValue({ id: "new-condition-id" });
const deleteAllergySpy = vi.fn().mockResolvedValue(undefined);
const createAllergySpy = vi.fn().mockResolvedValue({ id: "new-allergy-id" });
const deleteConditionSpy = vi.fn().mockResolvedValue(undefined);
const createSurgicalHistorySpy = vi
  .fn()
  .mockResolvedValue({ id: "new-surgery-id" });
const deleteSurgicalHistorySpy = vi.fn().mockResolvedValue(undefined);
const createFamilyHistorySpy = vi
  .fn()
  .mockResolvedValue({ id: "new-family-id" });
const deleteFamilyHistorySpy = vi.fn().mockResolvedValue(undefined);
const upsertSocialHistorySpy = vi
  .fn()
  .mockResolvedValue({ id: "social-history-1" });
const updateAllergySpy = vi
  .fn()
  .mockResolvedValue({ id: "allergy-1" });

vi.mock("@/features/patients/api/patients.api", () => ({
  patientsApi: {
    createCondition: (...args: unknown[]) => createConditionSpy(...args),
    deleteCondition: (...args: unknown[]) => deleteConditionSpy(...args),
    createAllergy: (...args: unknown[]) => createAllergySpy(...args),
    deleteAllergy: (...args: unknown[]) => deleteAllergySpy(...args),
    updateAllergy: (...args: unknown[]) => updateAllergySpy(...args),
    createSurgicalHistory: (...args: unknown[]) =>
      createSurgicalHistorySpy(...args),
    deleteSurgicalHistory: (...args: unknown[]) =>
      deleteSurgicalHistorySpy(...args),
    createFamilyHistory: (...args: unknown[]) =>
      createFamilyHistorySpy(...args),
    deleteFamilyHistory: (...args: unknown[]) =>
      deleteFamilyHistorySpy(...args),
    upsertSocialHistory: (...args: unknown[]) =>
      upsertSocialHistorySpy(...args),
  },
}));

import { usePatientHistory } from "./use-patient-history";

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }
  return Wrapper;
}

describe("usePatientHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("addCondition posts to the medical-history conditions sub-resource", async () => {
    const { result } = renderHook(() => usePatientHistory("patient-123"), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.operations.addCondition("Hypertension");
    });

    await waitFor(() => {
      expect(createConditionSpy).toHaveBeenCalledTimes(1);
    });

    expect(createConditionSpy).toHaveBeenCalledWith("patient-123", {
      conditionName: "Hypertension",
      conditionType: "CHRONIC",
      status: "ACTIVE",
      sourceType: "MANUAL",
      diagnosedBy: "",
      notes: "",
    });
  });

  it("ignores empty/whitespace condition input", async () => {
    const { result } = renderHook(() => usePatientHistory("patient-123"), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.operations.addCondition("   ");
    });

    expect(createConditionSpy).not.toHaveBeenCalled();
  });

  it("removeAllergy deletes against the medical-history allergies sub-resource", async () => {
    const { result } = renderHook(() => usePatientHistory("patient-123"), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.operations.removeAllergy("allergy-1");
    });

    await waitFor(() => {
      expect(deleteAllergySpy).toHaveBeenCalledTimes(1);
    });

    expect(deleteAllergySpy).toHaveBeenCalledWith("patient-123", "allergy-1");
  });

  it("addAllergy defaults to MODERATE/DRUG and posts to the allergies sub-resource", async () => {
    const { result } = renderHook(() => usePatientHistory("patient-123"), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.operations.addAllergy("Penicillin");
    });

    await waitFor(() => {
      expect(createAllergySpy).toHaveBeenCalledTimes(1);
    });

    expect(createAllergySpy).toHaveBeenCalledWith("patient-123", {
      allergen: "Penicillin",
      severity: "MODERATE",
      allergyType: "DRUG",
      reaction: "",
    });
  });
});
