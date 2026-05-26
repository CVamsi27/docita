import { client } from "@/lib/api/api-client";
import { loadInternalClinicUsers } from "@workspace/data-access/internal";
import type { User } from "./types";
import { mapInternalPortalUserToUser } from "./api-mappers";

const fetcher = <T,>(endpoint: string) => client.get<T>(endpoint);

export async function fetchClinicUsers(clinicId: string): Promise<User[]> {
  const users = await loadInternalClinicUsers(fetcher, clinicId);
  return users.map(mapInternalPortalUserToUser);
}
