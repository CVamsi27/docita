import type { QueueItem } from "@workspace/data-access";
import type { DeskFloorRow } from "./DeskFloorPanelUISections";
import { getOpdQueueSummaryLine } from "@/features/consultation";

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
