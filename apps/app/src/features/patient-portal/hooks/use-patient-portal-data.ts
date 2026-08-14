"use client";

import { useMemo } from "react";
import {
  getUserFacingErrorMessage,
  getPatientFullName,
} from "@workspace/utils";
import { usePatientAppointments } from "@workspace/data-access";
import { usePatient } from "@workspace/data-access";

import type { PatientPortalSnapshot } from "@/features/patient-portal/types/patient-portal-types";
import { summarizePortalSnapshot } from "@/features/patient-portal/rules/patient-portal-rules";
import { buildPatientPortalSnapshot } from "@/features/patient-portal/lib/patient-portal-snapshot";

export function usePatientPortalData(patientId?: string | null) {
  const hasPatientId = Boolean(patientId);

  const { data: patient } = usePatient(patientId || "");
  const {
    data: appointmentsResponse,
    isLoading: isAppointmentsLoading,
    error: appointmentsError,
  } = usePatientAppointments(patientId || "");

  const snapshot = useMemo<PatientPortalSnapshot>(() => {
    return buildPatientPortalSnapshot(
      appointmentsResponse?.items,
      hasPatientId,
      Date.now(),
    );
  }, [appointmentsResponse?.items, hasPatientId]);

  const summary = useMemo(() => summarizePortalSnapshot(snapshot), [snapshot]);

  const error = useMemo(() => {
    if (!hasPatientId) return "We could not open this page. Please go back to your portal home and try again.";
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
