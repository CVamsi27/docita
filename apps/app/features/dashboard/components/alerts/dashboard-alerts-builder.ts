import {
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  UserPlus,
  Users,
  Zap,
} from "lucide-react";
import type { AlertItem } from "./dashboard-alerts-ui";
import type { DashboardAlertDensity } from "./dashboard-alerts-types";

export interface DashboardAlertsBuildInput {
  density: DashboardAlertDensity;
  todayAppointments: number;
  completedAppointments: number;
  uncodedVisits: number;
  pendingJoinRequests: number;
  patientsWaiting: number;
  nextPatientName?: string;
  nextPatientId?: string;
  progressPercentage: number;
  dismissedAlerts: string[];
  medicalCodingEnabled: boolean;
  hour: number;
}

export function buildDashboardAlerts(
  input: DashboardAlertsBuildInput,
): AlertItem[] {
  return [
    ...morningOverviewAlert(input),
    ...patientsWaitingAlert(input),
    ...nextPatientAlert(input),
    ...uncodedVisitsAlert(input),
    ...pendingJoinRequestsAlert(input),
    ...scheduleProgressAlerts(input),
  ].filter((alert) => !input.dismissedAlerts.includes(alert.id));
}

function morningOverviewAlert(input: DashboardAlertsBuildInput): AlertItem[] {
  if (
    input.density !== "full" ||
    input.hour >= 12 ||
    input.todayAppointments <= 0
  ) return [];
  return [
    {
      id: "morning-overview",
      type: "info",
      icon: Calendar,
      title: `Good morning! You have ${input.todayAppointments} appointment${pluralSuffix(input.todayAppointments)} today`,
      description: waitingDescription(input.patientsWaiting),
      action: { label: "View Schedule", href: "/consultation" },
      dismissible: true,
    },
  ];
}

function patientsWaitingAlert(input: DashboardAlertsBuildInput): AlertItem[] {
  if (input.patientsWaiting <= 3) return [];
  return [
    {
      id: "patients-waiting",
      type: "urgent",
      icon: Users,
      title: `${input.patientsWaiting} patients are waiting`,
      description: "Consider expediting consultations",
      action: { label: "Open Queue", href: "/consultation" },
    },
  ];
}

function nextPatientAlert(input: DashboardAlertsBuildInput): AlertItem[] {
  if (
    input.density !== "full" ||
    !input.nextPatientName ||
    !input.nextPatientId
  ) return [];
  return [
    {
      id: "next-patient",
      type: "info",
      icon: Zap,
      title: `Next: ${input.nextPatientName}`,
      description: "Ready for consultation",
      action: {
        label: "Start Consultation",
        href: `/consultation/${input.nextPatientId}`,
      },
    },
  ];
}

function uncodedVisitsAlert(input: DashboardAlertsBuildInput): AlertItem[] {
  if (input.uncodedVisits <= 0 || !input.medicalCodingEnabled) return [];
  return [
    {
      id: "uncoded-visits",
      type: "warning",
      icon: FileText,
      title: `${input.uncodedVisits} visit${pluralSuffix(input.uncodedVisits)} pending coding`,
      action: { label: "Review", href: "/coding-queue" },
      dismissible: input.density === "full",
    },
  ];
}

function pendingJoinRequestsAlert(
  input: DashboardAlertsBuildInput,
): AlertItem[] {
  if (input.pendingJoinRequests <= 0) return [];
  return [
    {
      id: "pending-join-requests",
      type: "urgent",
      icon: UserPlus,
      title: `${input.pendingJoinRequests} join request${pluralSuffix(input.pendingJoinRequests)} waiting for approval`,
      description:
        "Open the review queue to approve or reject new staff requests",
      action: {
        label: "Review requests",
        href: "/settings/team/join-requests",
      },
      dismissible: input.density === "full",
    },
  ];
}

function scheduleProgressAlerts(input: DashboardAlertsBuildInput): AlertItem[] {
  if (input.density !== "full") return [];
  return [
    ...halfwayDoneAlert(input),
    ...allDoneAlert(input),
    ...endOfDayReminderAlert(input),
  ];
}

function halfwayDoneAlert(input: DashboardAlertsBuildInput): AlertItem[] {
  if (input.progressPercentage !== 50 || input.todayAppointments < 4) return [];
  return [
    {
      id: "halfway-done",
      type: "success",
      icon: CheckCircle2,
      title: "Halfway through today's schedule!",
      description: `${input.completedAppointments} of ${input.todayAppointments} appointments completed`,
      dismissible: true,
    },
  ];
}

function allDoneAlert(input: DashboardAlertsBuildInput): AlertItem[] {
  if (input.progressPercentage !== 100 || input.todayAppointments <= 0)
    return [];
  return [
    {
      id: "all-done",
      type: "success",
      icon: CheckCircle2,
      title: "All appointments completed for today!",
      description: "Great work!",
      dismissible: true,
    },
  ];
}

function endOfDayReminderAlert(input: DashboardAlertsBuildInput): AlertItem[] {
  if (input.hour < 17 || input.completedAppointments >= input.todayAppointments)
    return [];
  const remaining = input.todayAppointments - input.completedAppointments;
  return [
    {
      id: "eod-reminder",
      type: "warning",
      icon: Clock,
      title: `${remaining} appointment${pluralSuffix(remaining)} remaining`,
      description: "End of day approaching",
      action: { label: "View Queue", href: "/consultation" },
      dismissible: true,
    },
  ];
}

function waitingDescription(patientsWaiting: number): string | undefined {
  return patientsWaiting > 0
    ? `${patientsWaiting} patient${pluralSuffix(patientsWaiting)} currently waiting`
    : undefined;
}

function pluralSuffix(count: number): string {
  return count === 1 ? "" : "s";
}
