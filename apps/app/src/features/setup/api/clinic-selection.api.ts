import { api } from "@/lib/api/api-client";

export interface ClinicSelection {
  id: string;
  name: string;
  address?: string;
  city?: string;
  role: string;
}

export function getClinicsForSelection(): Promise<ClinicSelection[]> {
  return api.get<ClinicSelection[]>("/api/v1/clinics");
}
