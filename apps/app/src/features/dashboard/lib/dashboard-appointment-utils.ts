import { type AppointmentListItem } from "@workspace/data-access";

interface DashboardAppointmentStats {
  todayAppointments: AppointmentListItem[];
  completedToday: number;
  inProgressToday: number;
  currentPatient: AppointmentListItem | undefined;
  nextPatients: AppointmentListItem[];
  waitingCount: number;
}

export function computeDashboardAppointments(
  rawAppointmentsResponse: { items?: AppointmentListItem[] } | undefined,
): DashboardAppointmentStats {
  const appointmentsData = rawAppointmentsResponse?.items || [];
  const validAppointments = appointmentsData.filter(
    (appointment): appointment is AppointmentListItem =>
      Boolean(appointment.id && appointment.startTime),
  );

  const sorted = [...validAppointments].sort(
    (a, b) =>
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  );

  const completedToday = sorted.filter((a) => a.status === "completed").length;
  const inProgressToday = sorted.filter((a) => a.status === "in-progress").length;
  const waitingCount = sorted.filter((a) => a.status === "scheduled").length;
  const currentPatient = sorted.find((a) => a.status === "in-progress");
  const nextPatients = sorted.filter((a) => a.status === "scheduled").slice(0, 3);

  return {
    todayAppointments: sorted,
    completedToday,
    inProgressToday,
    currentPatient,
    nextPatients,
    waitingCount,
  };
}
