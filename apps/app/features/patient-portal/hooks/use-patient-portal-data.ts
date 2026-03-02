"use client";

import { useMemo } from "react";
import {
  type AppointmentWithRelations,
  usePatientAppointments,
} from "@/hooks/api/use-appointments";
import { usePatient } from "@/hooks/api/use-patients";

import type {
  PatientPortalSnapshot,
  PatientPrescriptionStatus,
} from "@/features/patient-portal/types/patient-portal-types";
import { summarizePortalSnapshot } from "@/features/patient-portal/rules/patient-portal-rules";

type AppointmentWithPortalRelations = AppointmentWithRelations & {
  id: string;
  startTime: string;
  status?: string;
  prescription?: {
    id: string;
    createdAt?: string;
    medications?: Array<{ name?: string | null }>;
  } | null;
  invoice?: {
    id: string;
    total?: number;
    status?: string;
    createdAt?: string;
  } | null;
};

function mapAppointmentStatus(
  status: string | undefined,
): "CONFIRMED" | "PENDING" | "COMPLETED" {
  const normalized = (status || "").toLowerCase();
  if (normalized === "completed") {
    return "COMPLETED";
  }
  if (
    normalized === "confirmed" ||
    normalized === "checked-in" ||
    normalized === "in-progress"
  ) {
    return "CONFIRMED";
  }
  return "PENDING";
}

function mapInvoiceStatus(
  status: string | undefined,
): "PENDING" | "PAID" | "OVERDUE" {
  const normalized = (status || "").toUpperCase();
  if (normalized === "PAID") {
    return "PAID";
  }
  if (normalized === "OVERDUE") {
    return "OVERDUE";
  }
  return "PENDING";
}

export function usePatientPortalData(patientId?: string | null) {
  const hasPatientId = Boolean(patientId);

  const { data: patient } = usePatient(patientId || "");
  const {
    data: appointmentsResponse,
    isLoading: isAppointmentsLoading,
    error: appointmentsError,
  } = usePatientAppointments(patientId || "");

  const snapshot = useMemo<PatientPortalSnapshot>(() => {
    if (!hasPatientId) {
      return {
        upcomingAppointments: [],
        activePrescriptions: [],
        outstandingInvoices: [],
      };
    }

    const items: AppointmentWithPortalRelations[] =
      (appointmentsResponse?.items || []).filter(
        (item): item is AppointmentWithPortalRelations =>
          Boolean(item.id && item.startTime),
      );

    const now = Date.now();

    const upcomingAppointments = items
      .filter((item) => {
        const scheduledAt = new Date(item.startTime).getTime();
        const status = (item.status || "").toLowerCase();
        return (
          Number.isFinite(scheduledAt) &&
          scheduledAt >= now &&
          status !== "cancelled" &&
          status !== "no-show"
        );
      })
      .sort(
        (a, b) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
      )
      .slice(0, 10)
      .map((item) => ({
        id: item.id,
        doctorName: item.doctor?.name || "Assigned Doctor",
        clinicName: "Your Clinic",
        scheduledAt: item.startTime,
        status: mapAppointmentStatus(item.status),
      }));

    const activePrescriptions = items
      .filter((item) => Boolean(item.prescription?.id))
      .map((item) => {
        const medicationName =
          item.prescription?.medications?.[0]?.name || "Prescription";
        const prescriptionStatus: PatientPrescriptionStatus =
          mapAppointmentStatus(item.status) === "COMPLETED"
            ? "COMPLETED"
            : "ACTIVE";

        return {
          id: item.prescription?.id || item.id,
          title: medicationName,
          prescribedBy: item.doctor?.name || "Assigned Doctor",
          issuedAt: item.prescription?.createdAt || item.startTime,
          status: prescriptionStatus,
        };
      });

    const invoiceMap = new Map<
      string,
      PatientPortalSnapshot["outstandingInvoices"][number]
    >();
    for (const item of items) {
      if (!item.invoice?.id) {
        continue;
      }

      const mappedStatus = mapInvoiceStatus(item.invoice.status);
      if (mappedStatus === "PAID") {
        continue;
      }

      invoiceMap.set(item.invoice.id, {
        id: item.invoice.id,
        amount: item.invoice.total || 0,
        dueAt: item.invoice.createdAt || item.startTime,
        status: mappedStatus,
      });
    }

    return {
      upcomingAppointments,
      activePrescriptions,
      outstandingInvoices: Array.from(invoiceMap.values()),
    };
  }, [appointmentsResponse?.items, hasPatientId]);

  const summary = useMemo(() => summarizePortalSnapshot(snapshot), [snapshot]);

  const error = useMemo(() => {
    if (!hasPatientId) {
      return "Open the portal with a patient context (for example: /portal?patientId=<id>).";
    }
    return appointmentsError?.message || null;
  }, [appointmentsError?.message, hasPatientId]);

  return {
    isLoading: hasPatientId ? isAppointmentsLoading : false,
    error,
    snapshot,
    summary,
    patientName: patient ? `${patient.firstName} ${patient.lastName}` : null,
  };
}
