import {
  addMinutesToClinicWallDatetimeLocal,
  clinicWallDatetimeLocalToUtcIso,
} from "@workspace/utils";
import type { AppointmentRequestResponse } from "@workspace/types";
import { fetchNextAvailableSlotWindow } from "@/lib/utils/doctor-availability-first-slot";
import {
  preferredDateTimeWallLocal,
  utcRequestedSlotToWallLocal,
} from "./request-row-helpers";

export type ApprovalWindowResult =
  | {
      kind: "ok";
      startUtc: string;
      endUtc: string;
    }
  | {
      kind: "missing-doctor";
    }
  | {
      kind: "invalid-window";
    };

interface ResolveApprovalWindowParams {
  request: AppointmentRequestResponse;
  doctorId: string | undefined;
  manualStartLocal: string | undefined;
  clinicTz: string;
}

/**
 * Resolves the (startUtc, endUtc) window for approving an appointment request.
 *
 * Priority order:
 *  1. Manually edited startTime from the row (if present), with structured-end fallback.
 *  2. Structured `requestedSlotStart` / `requestedSlotEnd` from the request itself.
 *  3. Next available slot from the doctor's schedule.
 *  4. Patient-preferred date+time as a last resort.
 *
 * If no end is resolvable, defaults to +30 minutes from start.
 * Pure aside from the schedule lookup delegated to `fetchNextAvailableSlotWindow`.
 */
export async function resolveApprovalWindow({
  request,
  doctorId,
  manualStartLocal,
  clinicTz,
}: ResolveApprovalWindowParams): Promise<ApprovalWindowResult> {
  if (!doctorId) {
    return { kind: "missing-doctor" };
  }

  const structuredStart = utcRequestedSlotToWallLocal(
    request.requestedSlotStart,
    clinicTz,
  );
  const structuredEnd = utcRequestedSlotToWallLocal(
    request.requestedSlotEnd,
    clinicTz,
  );

  let startLocal: string | null = manualStartLocal ?? structuredStart ?? null;
  let endLocal: string | null = structuredEnd ?? null;

  if (!startLocal || !endLocal) {
    const fromSchedule = await fetchNextAvailableSlotWindow(
      request.preferredDate,
      doctorId,
      clinicTz,
    );
    if (fromSchedule) {
      startLocal = startLocal ?? fromSchedule.startLocal;
      endLocal = endLocal ?? fromSchedule.endLocal;
    }
  }

  startLocal =
    startLocal ??
    preferredDateTimeWallLocal(
      request.preferredDate,
      request.preferredTime,
      clinicTz,
    );
  endLocal =
    endLocal ??
    addMinutesToClinicWallDatetimeLocal(startLocal, 30, clinicTz) ??
    startLocal;

  const startUtc = clinicWallDatetimeLocalToUtcIso(startLocal, clinicTz);
  const endUtc = clinicWallDatetimeLocalToUtcIso(endLocal, clinicTz);

  if (!startUtc || !endUtc) {
    return { kind: "invalid-window" };
  }

  return { kind: "ok", startUtc, endUtc };
}
