import { client } from "@/lib/api-client";
import type { DashboardClinic, DashboardStats } from "./types";

export async function fetchDashboardClinics(
): Promise<DashboardClinic[]> {
  const data = await client.get<DashboardClinic[] | { items?: DashboardClinic[] }>(
    "/super-admin/clinics",
  );
  return Array.isArray(data) ? data : (data.items ?? []);
}

export async function fetchDashboardStats(
): Promise<DashboardStats> {
  return client.get<DashboardStats>("/super-admin/stats");
}
