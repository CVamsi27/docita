import { API_URL } from "@/lib/api";
import type { Clinic, User } from "./types";

export async function fetchClinics(token: string): Promise<Clinic[]> {
  const response = await fetch(`${API_URL}/super-admin/clinics`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error("Failed to load clinics");
  }

  const data = await response.json();
  return Array.isArray(data) ? data : (data.items ?? []);
}

export async function fetchClinicUsers(
  token: string,
  clinicId: string,
): Promise<User[]> {
  const [doctorsResponse, adminsResponse] = await Promise.all([
    fetch(`${API_URL}/super-admin/clinics/${clinicId}/doctors`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
    fetch(`${API_URL}/super-admin/clinics/${clinicId}/admins`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  ]);

  const doctors = doctorsResponse.ok ? await doctorsResponse.json() : [];
  const admins = adminsResponse.ok ? await adminsResponse.json() : [];

  return [
    ...(Array.isArray(doctors) ? doctors : []),
    ...(Array.isArray(admins) ? admins : []),
  ];
}

export async function fetchUsersForSelection(
  token: string,
  selectedClinic: string,
  clinics: Clinic[],
): Promise<User[]> {
  if (selectedClinic === "all") {
    if (clinics.length === 0) {
      return [];
    }

    const allUsers = await Promise.all(
      clinics.map((clinic) => fetchClinicUsers(token, clinic.id)),
    );

    return allUsers.flat();
  }

  return fetchClinicUsers(token, selectedClinic);
}
