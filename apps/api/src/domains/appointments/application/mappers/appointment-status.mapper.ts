import { AppointmentStatusEnum } from '@/domains/appointments/core/value-objects/appointment-status.value-object';

const APPOINTMENT_STATUS_ALIASES: Record<string, AppointmentStatusEnum> = {
  scheduled: AppointmentStatusEnum.SCHEDULED,
  confirmed: AppointmentStatusEnum.CONFIRMED,
  arrived: AppointmentStatusEnum.ARRIVED,
  'checked-in': AppointmentStatusEnum.ARRIVED,
  in_progress: AppointmentStatusEnum.IN_PROGRESS,
  'in-progress': AppointmentStatusEnum.IN_PROGRESS,
  completed: AppointmentStatusEnum.COMPLETED,
  cancelled: AppointmentStatusEnum.CANCELLED,
  noshow: AppointmentStatusEnum.NOSHOW,
  'no-show': AppointmentStatusEnum.NOSHOW,
};

export function parseAppointmentStatus(
  status: string,
): AppointmentStatusEnum | undefined {
  return APPOINTMENT_STATUS_ALIASES[status.trim().toLowerCase()];
}
