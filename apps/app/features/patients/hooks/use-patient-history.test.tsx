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

vi.mock("@/lib/errors/user-facing-errors", () => ({
  showUserFacingErrorToast: vi.fn(),
}));

vi.mock("@/lib/monitoring/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

const createConditionMutate = vi.fn();
const deleteAllergyMutate = vi.fn();
const createAllergyMutate = vi.fn();

vi.mock("@workspace/data-access", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@workspace/data-access")>();
  return {
    ...actual,
    usePatient: vi.fn(() => ({
      data: { id: "patient-123", firstName: "Test", lastName: "Patient" },
      isLoading: false,
      isError: false,
    })),
    useUpdatePatient: vi.fn(() => ({ mutate: vi.fn() })),
    usePatientMedicalHistoryFull: vi.fn(() => ({
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
    useCreatePatientCondition: vi.fn(() => ({
      mutate: createConditionMutate,
    })),
    useDeletePatientCondition: vi.fn(() => ({ mutate: vi.fn() })),
    useCreatePatientAllergy: vi.fn(() => ({ mutate: createAllergyMutate })),
    useDeletePatientAllergy: vi.fn(() => ({ mutate: deleteAllergyMutate })),
    useUpdatePatientAllergy: vi.fn(() => ({ mutate: vi.fn() })),
    useCreatePatientSurgicalHistory: vi.fn(() => ({ mutate: vi.fn() })),
    useDeletePatientSurgicalHistory: vi.fn(() => ({ mutate: vi.fn() })),
    useCreatePatientFamilyHistory: vi.fn(() => ({ mutate: vi.fn() })),
    useDeletePatientFamilyHistory: vi.fn(() => ({ mutate: vi.fn() })),
    useUpsertPatientSocialHistory: vi.fn(() => ({ mutate: vi.fn() })),
  };
});

import { DataAccessProvider } from "@workspace/data-access";
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
      <DataAccessProvider
        config={{
          fetcher: () => Promise.resolve({ ok: true } as never),
          getClinicId: () => "clinic-1",
          getClinicTimezone: () => "UTC",
          isTierFeatureEnabled: () => true,
        }}
      >
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </DataAccessProvider>
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
      expect(createConditionMutate).toHaveBeenCalledTimes(1);
    });

    expect(createConditionMutate).toHaveBeenCalledWith(
      {
        conditionName: "Hypertension",
        conditionType: "CHRONIC",
        status: "ACTIVE",
        sourceType: "MANUAL",
        diagnosedBy: "",
        notes: "",
      },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it("ignores empty/whitespace condition input", async () => {
    const { result } = renderHook(() => usePatientHistory("patient-123"), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.operations.addCondition("   ");
    });

    expect(createConditionMutate).not.toHaveBeenCalled();
  });

  it("removeAllergy deletes against the medical-history allergies sub-resource", async () => {
    const { result } = renderHook(() => usePatientHistory("patient-123"), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.operations.removeAllergy("allergy-1");
    });

    await waitFor(() => {
      expect(deleteAllergyMutate).toHaveBeenCalledTimes(1);
    });

    expect(deleteAllergyMutate).toHaveBeenCalledWith(
      "allergy-1",
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it("addAllergy defaults to MODERATE/DRUG and posts to the allergies sub-resource", async () => {
    const { result } = renderHook(() => usePatientHistory("patient-123"), {
      wrapper: createWrapper(),
    });

    await act(async () => {
      result.current.operations.addAllergy("Penicillin");
    });

    await waitFor(() => {
      expect(createAllergyMutate).toHaveBeenCalledTimes(1);
    });

    expect(createAllergyMutate).toHaveBeenCalledWith(
      {
        allergen: "Penicillin",
        severity: "MODERATE",
        allergyType: "DRUG",
        reaction: "",
      },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });
});
