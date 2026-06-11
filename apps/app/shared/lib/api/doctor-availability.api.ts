"use client";

import type { AvailableSlot } from "@workspace/types";
import { api } from "@/lib/api/api-client";

export function fetchDoctorAvailabilitySlots(params: {
  date: string;
  doctorId: string;
}): Promise<AvailableSlot[]> {
  return api.get<AvailableSlot[]>(
    `/doctor-availability/slots?${new URLSearchParams(params).toString()}`,
  );
}
