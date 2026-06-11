"use client";

import type { AppConfig } from "@/lib/constants/app-config";
import { apiFetch } from "@/lib/api/api-client";

export function fetchAppConfig(): Promise<AppConfig> {
  return apiFetch<AppConfig>("/config", {
    method: "GET",
    cache: "no-store",
  });
}
