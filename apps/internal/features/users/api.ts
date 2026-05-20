import { client } from "@/lib/api/api-client";
import {
  type InternalDashboardClinic,
  loadInternalClinicUsers,
  loadInternalUsersForSelection,
  normalizeClinicsList,
} from "@workspace/data-access/internal";
import type { Clinic, User } from "./types";

const fetcher = <T,>(endpoint: string) => client.get<T>(endpoint);

export async function fetchClinics(): Promise<Clinic[]> {
  const data = await client.get<
    InternalDashboardClinic[] | { items?: InternalDashboardClinic[] }
  >("/internal/clinics");
  return normalizeClinicsList(data) as Clinic[];
}

export async function fetchClinicUsers(clinicId: string): Promise<User[]> {
  return loadInternalClinicUsers(fetcher, clinicId) as Promise<User[]>;
}

export async function fetchUsersForSelection(
  selectedClinic: string,
  clinics: Clinic[],
): Promise<User[]> {
  return loadInternalUsersForSelection(
    fetcher,
    selectedClinic,
    clinics,
  ) as Promise<User[]>;
}
