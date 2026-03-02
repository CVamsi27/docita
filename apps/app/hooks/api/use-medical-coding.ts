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
    `/medical-coding/icd-codes?search=${encodeURIComponent(search)}`,
  );

export const useCPTCodes = (search: string) =>
  useAPIQuery<CptCode[]>(
    ["cpt-codes", search],
    `/medical-coding/cpt-codes?search=${encodeURIComponent(search)}`,
  );

export const useICDFavorites = () =>
  useAPIQuery<IcdFavorite[]>(["icd-favorites"], "/medical-coding/favorites");

export const useCPTFavorites = () =>
  useAPIQuery<CptFavorite[]>(
    ["cpt-favorites"],
    "/medical-coding/cpt-favorites",
  );

export const useAddICDFavorite = () =>
  useAPIMutation<IcdFavorite, { icdCodeId: string }>(
    "/medical-coding/favorites",
    "POST",
  );

export const useRemoveICDFavorite = (id: string) =>
  useAPIMutation<void, void>(`/medical-coding/favorites/${id}`, "DELETE");

export const useAddCPTFavorite = () =>
  useAPIMutation<CptFavorite, { cptCodeId: string }>(
    "/medical-coding/cpt-favorites",
    "POST",
  );

export const useRemoveCPTFavorite = (id: string) =>
  useAPIMutation<void, void>(`/medical-coding/cpt-favorites/${id}`, "DELETE");

export const useCodingQueue = (search?: string) =>
  useAPIQuery<Appointment[]>(
    ["coding-queue", search ?? ""],
    `/medical-coding/uncoded${search ? `?search=${encodeURIComponent(search)}` : ""}`,
  );

export const useSearchIcdCodes = (search: string) =>
  useAPIQuery<IcdCode[]>(
    ["icd-codes", search],
    `/medical-coding/icd-codes?search=${encodeURIComponent(search || "")}`,
    { enabled: true },
  );

export const useSearchCptCodes = (search: string) =>
  useAPIQuery<CptCode[]>(
    ["cpt-codes", search],
    `/medical-coding/cpt-codes?search=${encodeURIComponent(search || "")}`,
    { enabled: true },
  );
