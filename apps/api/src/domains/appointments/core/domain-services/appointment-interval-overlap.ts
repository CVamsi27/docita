/** Minimal slot shape for overlap checks (Prisma-free). */
export interface AppointmentTimeSlot {
  id: string;
  startTime: Date;
  endTime: Date;
}

/** True when `[startA, endA)` overlaps `[startB, endB)` (half-open intervals). */
export function intervalsOverlap(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date,
): boolean {
  return startA < endB && endA > startB;
}

/** First existing appointment that conflicts with the candidate window. */
export function findFirstSchedulingConflict(
  candidateStart: Date,
  candidateEnd: Date,
  existing: readonly AppointmentTimeSlot[],
  excludeAppointmentId?: string,
): AppointmentTimeSlot | undefined {
  for (const slot of existing) {
    if (excludeAppointmentId && slot.id === excludeAppointmentId) {
      continue;
    }
    if (
      intervalsOverlap(
        candidateStart,
        candidateEnd,
        slot.startTime,
        slot.endTime,
      )
    ) {
      return slot;
    }
  }
  return undefined;
}
