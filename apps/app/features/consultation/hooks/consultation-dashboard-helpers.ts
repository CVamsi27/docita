import type { QueueItem } from "@/hooks/api/use-appointments";
import { formatUtcInstantAsClinicPickerIso } from "@workspace/utils";

export type DoctorNextUpRow =
  | {
      kind: "appointment";
      appointmentId: string;
      patientId?: string;
      startTime: string;
      patientName: string;
      status: string;
      visitSummary?: string;
    }
  | {
      kind: "queue";
      appointmentId?: string;
      patientId?: string;
      tokenNumber: number;
      createdAt: string;
      patientName: string;
      status: string;
      tokenType: QueueItem["tokenType"];
      visitSummary?: string;
    };

export function isDateLocalToday(
  value: string | Date | null | undefined,
  clinicTz: string,
  today: string,
): boolean {
  if (!value) return true;
  const date =
    typeof value === "string"
      ? new Date(value)
      : value instanceof Date
        ? value
        : new Date(value);
  if (Number.isNaN(date.getTime())) return true;
  return formatUtcInstantAsClinicPickerIso(date, clinicTz) === today;
}

export function isQueueItemForTodayFn(
  q: QueueItem,
  clinicTz: string,
  today: string,
): boolean {
  const appointmentStart =
    typeof (q as unknown as { appointment?: { startTime?: unknown } })
      ?.appointment?.startTime === "string"
      ? ((q as unknown as { appointment?: { startTime?: string } })
          .appointment?.startTime ?? null)
      : null;
  return (
    isDateLocalToday(appointmentStart, clinicTz, today) ||
    isDateLocalToday(q.createdAt, clinicTz, today)
  );
}
