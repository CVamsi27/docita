"use client";

import { useMemo } from "react";
import {
  getUserFacingErrorMessage,
  getPatientFullName,
} from "@workspace/utils";
import {
  type AppointmentListItem,
  usePatientAppointments,
} from "@workspace/data-access";
import { usePatient } from "@workspace/data-access";

import type {
  PatientPortalSnapshot,
  PatientPrescriptionStatus,
} from "@/features/patient-portal/types/patient-portal-types";
import { summarizePortalSnapshot } from "@/features/patient-portal/rules/patient-portal-rules";
import { mapAppointmentStatus } from "@/features/patient-portal/lib/map-portal-records";

type AppointmentWithPortalRelations = AppointmentListItem;

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

function toIsoString(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : value;
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

    const items: AppointmentWithPortalRelations[] = (
      appointmentsResponse?.items || []
    ).filter((item): item is AppointmentWithPortalRelations =>
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
        doctorName: item.doctor?.name ?? "",
        clinicName: item.clinicName ?? item.clinic?.name ?? "",
        scheduledAt: toIsoString(item.startTime),
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
          prescribedBy: item.doctor?.name ?? "",
          issuedAt: item.prescription?.createdAt
            ? toIsoString(item.prescription.createdAt)
            : toIsoString(item.startTime),
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
        currency: item.invoice.currency,
        dueAt: item.invoice.createdAt
          ? toIsoString(item.invoice.createdAt)
          : toIsoString(item.startTime),
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
      return "We could not open this page. Please go back to your portal home and try again.";
    }
    return appointmentsError
      ? getUserFacingErrorMessage(appointmentsError, {
          context: "load",
          fallback:
            "We could not load your portal information. Please try again.",
        })
      : null;
  }, [appointmentsError, hasPatientId]);

  return {
    isLoading: hasPatientId ? isAppointmentsLoading : false,
    error,
    snapshot,
    summary,
    patientName: patient ? getPatientFullName(patient) : null,
  };
}
