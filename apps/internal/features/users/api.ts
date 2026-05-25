import { client } from "@/lib/api/api-client";
import {
  type InternalDashboardClinic,
  loadInternalClinicUsers,
  loadInternalUsersForSelection,
  normalizeClinicsList,
} from "@workspace/data-access/internal";
import type { Clinic, User } from "./types";
import {
  mapInternalClinicToUserClinic,
  mapInternalPortalUserToUser,
} from "./api-mappers";

const fetcher = <T,>(endpoint: string) => client.get<T>(endpoint);

export async function fetchClinics(): Promise<Clinic[]> {
  const data = await client.get<
    InternalDashboardClinic[] | { items?: InternalDashboardClinic[] }
  >("/internal/clinics");
  return normalizeClinicsList(data).map(mapInternalClinicToUserClinic);
}

export async function fetchClinicUsers(clinicId: string): Promise<User[]> {
  const users = await loadInternalClinicUsers(fetcher, clinicId);
  return users.map(mapInternalPortalUserToUser);
}

export async function fetchUsersForSelection(
  selectedClinic: string,
  clinics: Clinic[],
): Promise<User[]> {
  const users = await loadInternalUsersForSelection(
    fetcher,
    selectedClinic,
    clinics,
  );
  return users.map(mapInternalPortalUserToUser);
}
