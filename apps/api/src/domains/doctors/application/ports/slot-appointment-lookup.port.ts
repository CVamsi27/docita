export interface SlotBlockingAppointment {
  doctorId: string;
  startTime: Date;
  endTime: Date;
}

export interface ISlotAppointmentLookup {
  findAppointmentsForSlots(
    clinicId: string,
    doctorIds: string[],
    rangeStart: Date,
    rangeEndExclusive: Date,
  ): Promise<SlotBlockingAppointment[]>;
}

export const SLOT_APPOINTMENT_LOOKUP_TOKEN = 'ISlotAppointmentLookup';
