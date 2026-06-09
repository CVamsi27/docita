import type { InternalClinicSummary, InternalPortalUser } from "../users.types";

type Fetcher = <T>(endpoint: string) => Promise<T>;

export async function loadInternalClinicUsers(
  fetcher: Fetcher,
  clinicId: string,
): Promise<InternalPortalUser[]> {
  const [doctorsResponse, adminsResponse] = await Promise.all([
    fetcher<InternalPortalUser[] | null>(
      `/internal/clinics/${clinicId}/doctors`,
    ),
    fetcher<InternalPortalUser[] | null>(
      `/internal/clinics/${clinicId}/admins`,
    ),
  ]);

  const doctors = Array.isArray(doctorsResponse) ? doctorsResponse : [];
  const admins = Array.isArray(adminsResponse) ? adminsResponse : [];
  const uniqueUsers = new Map<string, InternalPortalUser>();

  for (const user of [...doctors, ...admins]) {
    uniqueUsers.set(user.id, user);
  }

  return Array.from(uniqueUsers.values());
}

export async function loadInternalUsersForSelection(
  fetcher: Fetcher,
  selectedClinic: string,
  clinics: InternalClinicSummary[],
): Promise<InternalPortalUser[]> {
  if (selectedClinic === "all") {
    if (clinics.length === 0) return [];

    const allUsers = await Promise.all(
      clinics.map((clinic) => loadInternalClinicUsers(fetcher, clinic.id)),
    );

    return allUsers.flat();
  }

  return loadInternalClinicUsers(fetcher, selectedClinic);
}
