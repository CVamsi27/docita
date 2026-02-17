import { useAPIMutation, useAPIQuery } from '@/lib/api-core';

// Type definitions for patient portal DTOs
interface UpdatePatientProfileBodyDto {
  phoneNumber?: string;
  email?: string;
  address?: string;
  whatsappConsent?: boolean;
}

interface RequestAppointmentBodyDto {
  reason: string;
  preferredDate?: string;
  preferredTime?: string;
  notes?: string;
}

// ============================================================================
// Patient Dashboard
// ============================================================================

export const usePatientPortalDashboard = () =>
  useAPIQuery<{
    patient: Record<string, unknown>;
    summary: {
      upcomingAppointmentsCount: number;
      activePrescriptionsCount: number;
      outstandingInvoicesCount: number;
      totalOutstandingAmount: number;
    };
    upcomingAppointments: Record<string, unknown>[];
    activePrescriptions: Record<string, unknown>[];
    outstandingInvoices: Record<string, unknown>[];
  }>(
    ['patient-portal', 'dashboard'],
    '/patient-portal/dashboard'
  );

// ============================================================================
// Appointments
// ============================================================================

export const usePatientPortalAppointments = (filters?: {
  status?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}) =>
  useAPIQuery<{
    appointments: Record<string, unknown>[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  }>(
    ['patient-portal', 'appointments', filters || {}],
    '/patient-portal/appointments'
  );

export const usePatientPortalAppointmentById = (appointmentId: string) =>
  useAPIQuery(
    ['patient-portal', 'appointments', appointmentId],
    `/patient-portal/appointments/${appointmentId}`,
    {
      enabled: !!appointmentId,
    }
  );

export const useRequestAppointment = () =>
  useAPIMutation<Record<string, unknown>, RequestAppointmentBodyDto>(
    '/patient-portal/appointments/request',
    'POST'
  );

// ============================================================================
// Prescriptions
// ============================================================================

export const usePatientPortalPrescriptions = (filters?: {
  limit?: number;
  offset?: number;
}) =>
  useAPIQuery<{
    prescriptions: Record<string, unknown>[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  }>(
    ['patient-portal', 'prescriptions', filters || {}],
    '/patient-portal/prescriptions'
  );

export const usePatientPortalPrescriptionById = (prescriptionId: string) =>
  useAPIQuery(
    ['patient-portal', 'prescriptions', prescriptionId],
    `/patient-portal/prescriptions/${prescriptionId}`,
    {
      enabled: !!prescriptionId,
    }
  );

// ============================================================================
// Invoices
// ============================================================================

export const usePatientPortalInvoices = (filters?: {
  status?: string;
  limit?: number;
  offset?: number;
}) =>
  useAPIQuery<{
    invoices: Record<string, unknown>[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  }>(
    ['patient-portal', 'invoices', filters || {}],
    '/patient-portal/invoices'
  );

// ============================================================================
// Profile
// ============================================================================

export const useUpdatePatientProfile = () =>
  useAPIMutation<Record<string, unknown>, UpdatePatientProfileBodyDto>(
    '/patient-portal/profile',
    'PATCH'
  );

// ============================================================================
// Consent Management
// ============================================================================

export const usePatientConsentSettings = () =>
  useAPIQuery<{
    whatsappConsent: boolean;
    whatsappConsentAt: string | null;
    isFirstLogin: boolean;
  }>(
    ['patient-portal', 'consent'],
    '/patient-portal/consent'
  );

export const useUpdatePatientConsent = () =>
  useAPIMutation<Record<string, unknown>, { whatsappConsent?: boolean; dataStorageConsent?: boolean }>(
    '/patient-portal/consent',
    'PATCH'
  );

// ============================================================================
// Data Deletion (GDPR/DPDP)
// ============================================================================

export const useRequestDataDeletion = () =>
  useAPIMutation<Record<string, unknown>, { reason: string; confirmDeletion?: boolean }>(
    '/patient-portal/profile/delete-request',
    'POST'
  );
