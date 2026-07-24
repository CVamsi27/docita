"use client";

import { useMemo } from "react";
import { useLocalStorage } from "@workspace/hooks";
import { Feature } from "@workspace/types";
import { clinicWallHourMinuteFromUtcInstant, DEFAULT_TIMEZONE } from "@workspace/utils";
import { usePermissions } from "@/hooks/use-permissions";
import { usePermissionStore } from "@/lib/stores/permission-store";
import { DashboardAlertsUI } from "./dashboard-alerts-ui";
import { buildDashboardAlerts } from "./dashboard-alerts-builder";
import type { DashboardAlertDensity } from "./dashboard-alerts-types";

export type { DashboardAlertDensity };

interface DashboardAlertsContainerProps {
  density?: DashboardAlertDensity;
  todayAppointments: number;
  completedAppointments: number;
  uncodedVisits: number;
  pendingJoinRequests?: number;
  patientsWaiting?: number;
  nextPatientName?: string;
  nextPatientId?: string;
  className?: string;
}

export function DashboardAlertsContainer({
  density = "full",
  todayAppointments,
  completedAppointments,
  uncodedVisits,
  pendingJoinRequests = 0,
  patientsWaiting = 0,
  nextPatientName,
  nextPatientId,
  className,
}: DashboardAlertsContainerProps) {
  const [dismissedAlerts, setDismissedAlerts] = useLocalStorage<string[]>(
    "dashboard-dismissed-alerts",
    [],
  );

  const medicalCodingEnabled = usePermissionStore((s) =>
    s.canAccess(Feature.MEDICAL_CODING),
  );

  const progressPercentage =
    todayAppointments > 0
      ? Math.round((completedAppointments / todayAppointments) * 100)
      : 0;

  const alerts = useMemo(() => {
    const now = new Date();
    const { hour } = clinicWallHourMinuteFromUtcInstant(now, DEFAULT_TIMEZONE);
    return buildDashboardAlerts({
      density,
      todayAppointments,
      completedAppointments,
      uncodedVisits,
      pendingJoinRequests,
      patientsWaiting,
      progressPercentage,
      dismissedAlerts,
      medicalCodingEnabled,
      hour,
      ...(nextPatientName ? { nextPatientName } : {}),
      ...(nextPatientId ? { nextPatientId } : {}),
    });
  }, [
    density,
    todayAppointments,
    completedAppointments,
    uncodedVisits,
    pendingJoinRequests,
    patientsWaiting,
    nextPatientName,
    nextPatientId,
    progressPercentage,
    dismissedAlerts,
    medicalCodingEnabled,
  ]);

  const { canStartConsultation } = usePermissions();
  const filteredAlerts = useMemo(() => {
    if (!canStartConsultation) return alerts.filter(
        (alert) =>
          alert.action?.label !== "Start Consultation" &&
          alert.action?.label !== "Open Queue" &&
          alert.action?.label !== "View Schedule" &&
          alert.action?.label !== "View Queue",
      );
    return alerts;
  }, [alerts, canStartConsultation]);

  const handleDismissAlert = (id: string) => {
    setDismissedAlerts((prev) => [...prev, id]);
  };

  return (
    <DashboardAlertsUI
      alerts={filteredAlerts}
      progressPercentage={progressPercentage}
      todayAppointments={todayAppointments}
      completedAppointments={completedAppointments}
      onDismissAlert={handleDismissAlert}
      className={className}
      showProgressBar={density === "full"}
    />
  );
}
