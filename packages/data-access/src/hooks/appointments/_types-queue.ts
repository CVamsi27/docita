import type { AppointmentListItemContractResponse } from "@workspace/types";

export type AppointmentListItem = AppointmentListItemContractResponse;

export interface QueueItem {
  id: string;
  clinicId: string;
  patientId: string;
  appointmentId?: string;
  doctorId?: string;
  tokenNumber: number;
  status: string;
  priority: number;
  notes?: string;
  calledAt?: string;
  completedAt?: string;
  createdAt: string;
  tokenType: "scheduled" | "walk-in" | "late-arrival";
  scheduledTime?: string;
  estimatedDuration: number;
  consultationStart?: string;
  estimatedWaitTime?: number;
  patient?: {
    id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
  };
  doctor?: { id: string; name: string };
  appointment?: {
    id: string;
    doctor: { id: string; name: string };
    type?: string | null;
    chiefComplaint?: string | null;
    startTime?: string;
  };
}
