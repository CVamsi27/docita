import type { PrescriptionStatus } from "@workspace/types";

export type PatientAppointmentStatus = "CONFIRMED" | "PENDING" | "COMPLETED";

export type PatientPrescriptionStatus = PrescriptionStatus;

export type PatientInvoiceStatus = "PENDING" | "PAID" | "OVERDUE";

export interface PatientPortalAppointment {
  id: string;
  doctorName: string;
  clinicName: string;
  scheduledAt: string;
  status: PatientAppointmentStatus;
}

export interface PatientPortalPrescription {
  id: string;
  title: string;
  prescribedBy: string;
  issuedAt: string;
  status: PatientPrescriptionStatus;
}

export interface PatientPortalInvoice {
  id: string;
  amount: number;
  currency?: string;
  dueAt: string;
  status: PatientInvoiceStatus;
}

export interface PatientPortalSnapshot {
  upcomingAppointments: PatientPortalAppointment[];
  activePrescriptions: PatientPortalPrescription[];
  outstandingInvoices: {
    id: string;
    amount: number;
    currency?: string;
    dueAt: string;
    status: PatientInvoiceStatus;
  }[];
}
