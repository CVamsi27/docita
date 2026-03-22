import {
  Appointment,
  CptCode,
  CptFavorite,
  IcdCode,
  IcdFavorite,
} from "@workspace/types";
import { useAPIMutation, useAPIQuery } from "@/lib/api-core";

export const useICDCodes = (search: string) =>
  useAPIQuery<IcdCode[]>(
    ["icd-codes", search],
    `/clinical/medical-coding/icd/search?q=${encodeURIComponent(search)}`,
  );

export const useCPTCodes = (search: string) =>
  useAPIQuery<CptCode[]>(
    ["cpt-codes", search],
    `/clinical/medical-coding/cpt/search?q=${encodeURIComponent(search)}`,
  );

export const useICDFavorites = () =>
  useAPIQuery<IcdFavorite[]>(
    ["icd-favorites"],
    "/clinical/medical-coding/icd/favorites",
  );

export const useCPTFavorites = () =>
  useAPIQuery<CptFavorite[]>(
    ["cpt-favorites"],
    "/clinical/medical-coding/cpt/favorites",
  );

export const useAddICDFavorite = () =>
  useAPIMutation<IcdFavorite, { icdCodeId: string }>(
    "/clinical/medical-coding/icd/favorites",
    "POST",
  );

export const useRemoveICDFavorite = (id: string) =>
  useAPIMutation<void, void>(
    `/clinical/medical-coding/icd/favorites/${id}`,
    "DELETE",
  );

export const useAddCPTFavorite = () =>
  useAPIMutation<CptFavorite, { cptCodeId: string }>(
    "/clinical/medical-coding/cpt/favorites",
    "POST",
  );

export const useRemoveCPTFavorite = (id: string) =>
  useAPIMutation<void, void>(
    `/clinical/medical-coding/cpt/favorites/${id}`,
    "DELETE",
  );

export const useCodingQueue = (search?: string) =>
  useAPIQuery<Appointment[]>(
    ["coding-queue", search ?? ""],
    `/clinical/medical-coding/uncoded-visits${search ? `?search=${encodeURIComponent(search)}` : ""}`,
  );

export const useSearchIcdCodes = (search: string) =>
  useAPIQuery<IcdCode[]>(
    ["icd-codes", search],
    `/clinical/medical-coding/icd/search?q=${encodeURIComponent(search || "")}`,
    { enabled: true },
  );

export const useSearchCptCodes = (search: string) =>
  useAPIQuery<CptCode[]>(
    ["cpt-codes", search],
    `/clinical/medical-coding/cpt/search?q=${encodeURIComponent(search || "")}`,
    { enabled: true },
  );
