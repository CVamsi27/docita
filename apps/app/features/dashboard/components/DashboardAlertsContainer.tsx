import { useMemo } from "react";
import {
  Calendar,
  CheckCircle2,
  Clock,
  FileText,
  Users,
  Zap,
} from "lucide-react";
import { useLocalStorage } from "@workspace/hooks";
import { AlertItem, DashboardAlertsUI } from "./DashboardAlertsUI";

interface DashboardAlertsContainerProps {
  todayAppointments: number;
  completedAppointments: number;
  pendingReports: number;
  patientsWaiting?: number;
  nextPatientName?: string;
  nextPatientId?: string;
  className?: string;
}

export function DashboardAlertsContainer({
  todayAppointments,
  completedAppointments,
  pendingReports,
  patientsWaiting = 0,
  nextPatientName,
  nextPatientId,
  className,
}: DashboardAlertsContainerProps) {
  const [dismissedAlerts, setDismissedAlerts] = useLocalStorage<string[]>(
    "dashboard-dismissed-alerts",
    [],
  );

  const progressPercentage =
    todayAppointments > 0
      ? Math.round((completedAppointments / todayAppointments) * 100)
      : 0;

  const alerts = useMemo<AlertItem[]>(() => {
    const items: AlertItem[] = [];
    const now = new Date();
    const hour = now.getHours();

    if (hour < 12 && todayAppointments > 0) {
      items.push({
        id: "morning-overview",
        type: "info",
        icon: Calendar,
        title: `Good morning! You have ${todayAppointments} appointment${todayAppointments !== 1 ? "s" : ""} today`,
        description:
          patientsWaiting > 0
            ? `${patientsWaiting} patient${patientsWaiting !== 1 ? "s" : ""} currently waiting`
            : undefined,
        action: { label: "View Schedule", href: "/queue" },
        dismissible: true,
      });
    }

    if (patientsWaiting > 3) {
      items.push({
        id: "patients-waiting",
        type: "urgent",
        icon: Users,
        title: `${patientsWaiting} patients are waiting`,
        description: "Consider expediting consultations",
        action: { label: "Open Queue", href: "/queue" },
      });
    }

    if (nextPatientName && nextPatientId) {
      items.push({
        id: "next-patient",
        type: "info",
        icon: Zap,
        title: `Next: ${nextPatientName}`,
        description: "Ready for consultation",
        action: {
          label: "Start Consultation",
          href: `/consultation/${nextPatientId}`,
        },
      });
    }

    if (pendingReports > 0) {
      items.push({
        id: "pending-reports",
        type: "warning",
        icon: FileText,
        title: `${pendingReports} report${pendingReports !== 1 ? "s" : ""} pending coding`,
        action: { label: "Review", href: "/coding-queue" },
        dismissible: true,
      });
    }

    if (progressPercentage === 50 && todayAppointments >= 4) {
      items.push({
        id: "halfway-done",
        type: "success",
        icon: CheckCircle2,
        title: "Halfway through today's schedule!",
        description: `${completedAppointments} of ${todayAppointments} appointments completed`,
        dismissible: true,
      });
    }

    if (progressPercentage === 100 && todayAppointments > 0) {
      items.push({
        id: "all-done",
        type: "success",
        icon: CheckCircle2,
        title: "All appointments completed for today!",
        description: "Great work! 🎉",
        dismissible: true,
      });
    }

    if (hour >= 17 && completedAppointments < todayAppointments) {
      const remaining = todayAppointments - completedAppointments;
      items.push({
        id: "eod-reminder",
        type: "warning",
        icon: Clock,
        title: `${remaining} appointment${remaining !== 1 ? "s" : ""} remaining`,
        description: "End of day approaching",
        action: { label: "View Queue", href: "/queue" },
        dismissible: true,
      });
    }

    return items.filter((alert) => !dismissedAlerts.includes(alert.id));
  }, [
    todayAppointments,
    completedAppointments,
    pendingReports,
    patientsWaiting,
    nextPatientName,
    nextPatientId,
    progressPercentage,
    dismissedAlerts,
  ]);

  const handleDismissAlert = (id: string) => {
    setDismissedAlerts((prev) => [...prev, id]);
  };

  return (
    <DashboardAlertsUI
      alerts={alerts}
      progressPercentage={progressPercentage}
      todayAppointments={todayAppointments}
      completedAppointments={completedAppointments}
      onDismissAlert={handleDismissAlert}
      className={className}
    />
  );
}
