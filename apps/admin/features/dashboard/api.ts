import { API_URL } from "@/lib/api";
import type { DashboardClinic, DashboardStats } from "./types";

function handleAuthFailure(status: number, logout: (message?: string) => void) {
  if (status === 401) {
    logout("Your session has expired. Please log in again.");
    return true;
  }

  if (status === 404) {
    logout("Your account has been deleted. Please contact support.");
    return true;
  }

  if (status === 403) {
    logout("You no longer have permission to access this resource.");
    return true;
  }

  return false;
}

export async function fetchDashboardClinics(
  token: string,
  logout: (message?: string) => void,
): Promise<DashboardClinic[]> {
  const response = await fetch(`${API_URL}/super-admin/clinics`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (handleAuthFailure(response.status, logout)) {
    return [];
  }

  if (!response.ok) {
    throw new Error("Failed to fetch clinics");
  }

  const data = await response.json();
  return Array.isArray(data) ? data : (data.items ?? []);
}

export async function fetchDashboardStats(
  token: string,
  logout: (message?: string) => void,
): Promise<DashboardStats> {
  const response = await fetch(`${API_URL}/super-admin/stats`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (handleAuthFailure(response.status, logout)) {
    return {
      clinics: 0,
      users: 0,
      doctors: 0,
      patients: 0,
      invoices: 0,
      prescriptions: 0,
    };
  }

  if (!response.ok) {
    throw new Error("Failed to fetch dashboard stats");
  }

  return response.json();
}
