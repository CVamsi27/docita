"use client";

import { useMemo } from "react";
import { formatDate } from "@workspace/utils";
import type { Appointment } from "@workspace/types";
import {
  calculateBMI,
  getBMIStatus,
  getLatestVitals,
} from "@/features/patients/rules/vitals-rules";
import {
  LatestVitalsCard,
  VitalsHistoryTable,
  AdvancedMetricTracking,
  type VitalsRow,
} from "./VitalsTabSections";

interface VitalsTabProps {
  patientId: string;
  appointments: Appointment[];
  canRecordPatientVitals: boolean;
}

export function VitalsTab({
  patientId,
  appointments,
  canRecordPatientVitals,
}: VitalsTabProps) {
  const latest = useMemo(() => getLatestVitals(appointments), [appointments]);
  const latestBmi =
    latest?.vitals.bmi ??
    (latest?.vitals.weight && latest?.vitals.height
      ? calculateBMI(latest.vitals.weight, latest.vitals.height)
      : null);
  const bmiStatus = getBMIStatus(latestBmi);
  const latestDateLabel = latest
    ? formatDate(latest.date, "EEE, d MMM yyyy")
    : null;

  const rows = useMemo<VitalsRow[]>(() => {
    const out: VitalsRow[] = [];
    appointments.forEach((appt) => {
      if (!appt.vitalSign || !appt.id) return;
      const v = appt.vitalSign;
      const startTime =
        typeof appt.startTime === "string"
          ? new Date(appt.startTime)
          : appt.startTime;
      if (!Number.isFinite(startTime.getTime())) return;
      out.push({
        id: appt.id,
        date: startTime,
        bp: v.bloodPressure ?? null,
        pulse: v.pulse ?? null,
        temperature: v.temperature ?? null,
        spo2: v.spo2 ?? null,
        weight: v.weight ?? null,
        height: v.height ?? null,
        bmi:
          v.bmi ??
          (v.weight && v.height ? calculateBMI(v.weight, v.height) : null),
      });
    });
    return out.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [appointments]);

  return (
    <div className="space-y-6">
      <LatestVitalsCard
        latest={latest}
        latestDateLabel={latestDateLabel}
        latestBmi={latestBmi}
        bmiStatus={bmiStatus}
      />
      <VitalsHistoryTable rows={rows} />
      <AdvancedMetricTracking
        patientId={patientId}
        canRecordPatientVitals={canRecordPatientVitals}
      />
    </div>
  );
}
