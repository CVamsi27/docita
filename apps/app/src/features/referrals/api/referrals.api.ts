import { apiFetch } from "@/lib/api/api-client";

export interface HospitalBed {
  id: string;
  ward: string;
  roomNumber: string;
  bedNumber: string;
  status: string;
  patientName?: string;
}

export function getHospitalBeds(): Promise<HospitalBed[]> {
  return apiFetch<HospitalBed[]>("/hospital/beds");
}
