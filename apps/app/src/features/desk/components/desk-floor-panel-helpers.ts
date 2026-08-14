import type { QueueItem } from "@workspace/data-access";
import { DATE_FORMATS, DEFAULT_TIMEZONE } from "@workspace/utils";
import { getOpdQueueSummaryLine } from "@/features/consultation";
import { formatTime } from "@/lib/formatters";

export interface DeskFloorRow {
  id: string;
  tokenNumber: number;
  patientName: string;
  scheduledTime?: string | null;
  doctorName?: string | null;
  visitSummary?: string | null;
  isWalkIn: boolean;
}

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function formatToken(n: number): string {
  return String(n).padStart(2, "0");
}

export function formatScheduled(
  value: string | null | undefined,
  timezone: string = DEFAULT_TIMEZONE,
): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return formatTime(date, DATE_FORMATS.TIME_SHORT, timezone);
}

export function patientNameOf(item: QueueItem): string {
  const first = item.patient?.firstName?.trim() ?? "";
  const last = item.patient?.lastName?.trim() ?? "";
  return `${first} ${last}`.trim() || "Unknown patient";
}

export function toRow(item: QueueItem): DeskFloorRow {
  return {
    id: item.id,
    tokenNumber: item.tokenNumber,
    patientName: patientNameOf(item),
    scheduledTime: item.scheduledTime ?? null,
    doctorName: item.doctor?.name ?? item.appointment?.doctor?.name ?? null,
    visitSummary: getOpdQueueSummaryLine(item),
    isWalkIn: item.tokenType === "walk-in" || item.tokenType === "late-arrival",
  };
}

export function tokenSort(a: DeskFloorRow, b: DeskFloorRow): number {
  return a.tokenNumber - b.tokenNumber;
}

export function recentSort(a: QueueItem, b: QueueItem): number {
  const ta = a.completedAt ? new Date(a.completedAt).getTime() : 0;
  const tb = b.completedAt ? new Date(b.completedAt).getTime() : 0;
  return tb - ta;
}
