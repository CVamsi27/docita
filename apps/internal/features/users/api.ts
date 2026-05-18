import { client } from "@/lib/api/api-client";
import type { Clinic, User } from "./types";

export async function fetchClinics(): Promise<Clinic[]> {
  const data = await client.get<Clinic[] | { items?: Clinic[] }>(
    "/internal/clinics",
  );
  return Array.isArray(data) ? data : (data.items ?? []);
}

export async function fetchClinicUsers(clinicId: string): Promise<User[]> {
  const [doctorsResponse, adminsResponse] = await Promise.all([
    client.get<User[] | null>(`/internal/clinics/${clinicId}/doctors`),
    client.get<User[] | null>(`/internal/clinics/${clinicId}/admins`),
  ]);

  const doctors = Array.isArray(doctorsResponse) ? doctorsResponse : [];
  const admins = Array.isArray(adminsResponse) ? adminsResponse : [];
  const merged = [...doctors, ...admins];
  const uniqueUsers = new Map<string, User>();

  for (const user of merged) {
    uniqueUsers.set(user.id, user);
  }

  return Array.from(uniqueUsers.values());
}

export async function fetchUsersForSelection(
  selectedClinic: string,
  clinics: Clinic[],
): Promise<User[]> {
  if (selectedClinic === "all") {
    if (clinics.length === 0) {
      return [];
    }

    const allUsers = await Promise.all(
      clinics.map((clinic) => fetchClinicUsers(clinic.id)),
    );

    return allUsers.flat();
  }

  return fetchClinicUsers(selectedClinic);
}
