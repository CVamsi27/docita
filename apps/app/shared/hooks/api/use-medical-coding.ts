import {
  Appointment,
  CptCode,
  CptFavorite,
  Feature,
  IcdCode,
  IcdFavorite,
} from "@workspace/types";
import { useAPIMutation, useAPIQuery } from "@/lib/api/api-core";
import { useTierFeatureEnabled } from "@/hooks/api/tier-feature-guards";

const MIN_MEDICAL_CODE_SEARCH_LENGTH = 2;

function isMeaningfulMedicalCodeQuery(search: string): boolean {
  return search.trim().length >= MIN_MEDICAL_CODE_SEARCH_LENGTH;
}

export const useICDCodes = (search: string) => {
  const codingOk = useTierFeatureEnabled(Feature.MEDICAL_CODING);
  return useAPIQuery<IcdCode[]>(
    ["icd-codes", search],
    `/clinical/medical-coding/icd/search?q=${encodeURIComponent(search)}`,
    { enabled: codingOk && isMeaningfulMedicalCodeQuery(search) },
  );
};

export const useCPTCodes = (search: string) => {
  const codingOk = useTierFeatureEnabled(Feature.MEDICAL_CODING);
  return useAPIQuery<CptCode[]>(
    ["cpt-codes", search],
    `/clinical/medical-coding/cpt/search?q=${encodeURIComponent(search)}`,
    { enabled: codingOk && isMeaningfulMedicalCodeQuery(search) },
  );
};

export const useICDFavorites = () => {
  const codingOk = useTierFeatureEnabled(Feature.MEDICAL_CODING);
  return useAPIQuery<IcdFavorite[]>(
    ["icd-favorites"],
    "/clinical/medical-coding/icd/favorites",
    { enabled: codingOk },
  );
};

export const useCPTFavorites = () => {
  const codingOk = useTierFeatureEnabled(Feature.MEDICAL_CODING);
  return useAPIQuery<CptFavorite[]>(
    ["cpt-favorites"],
    "/clinical/medical-coding/cpt/favorites",
    { enabled: codingOk },
  );
};

export const useAddICDFavorite = () =>
  useAPIMutation<IcdFavorite, { code: string; description: string; category: string }>(
    "/clinical/medical-coding/icd/favorites",
    "POST",
  );

export const useRemoveICDFavorite = (id: string) =>
  useAPIMutation<void, void>(
    `/clinical/medical-coding/icd/favorites/${id}`,
    "DELETE",
  );

export const useAddCPTFavorite = () =>
  useAPIMutation<CptFavorite, { code: string; description: string; category: string }>(
    "/clinical/medical-coding/cpt/favorites",
    "POST",
  );

export const useRemoveCPTFavorite = (id: string) =>
  useAPIMutation<void, void>(
    `/clinical/medical-coding/cpt/favorites/${id}`,
    "DELETE",
  );

export const useCodingQueue = (search?: string) => {
  const codingOk = useTierFeatureEnabled(Feature.MEDICAL_CODING);
  return useAPIQuery<Appointment[]>(
    ["coding-queue", search ?? ""],
    `/clinical/medical-coding/uncoded-visits${search ? `?search=${encodeURIComponent(search)}` : ""}`,
    { enabled: codingOk },
  );
};

export const useSearchIcdCodes = (search: string) => {
  const codingOk = useTierFeatureEnabled(Feature.MEDICAL_CODING);
  return useAPIQuery<IcdCode[]>(
    ["icd-codes", search],
    `/clinical/medical-coding/icd/search?q=${encodeURIComponent(search || "")}`,
    {
      enabled:
        codingOk && isMeaningfulMedicalCodeQuery(search || ""),
    },
  );
};

export const useSearchCptCodes = (search: string) => {
  const codingOk = useTierFeatureEnabled(Feature.MEDICAL_CODING);
  return useAPIQuery<CptCode[]>(
    ["cpt-codes", search],
    `/clinical/medical-coding/cpt/search?q=${encodeURIComponent(search || "")}`,
    {
      enabled:
        codingOk && isMeaningfulMedicalCodeQuery(search || ""),
    },
  );
};
