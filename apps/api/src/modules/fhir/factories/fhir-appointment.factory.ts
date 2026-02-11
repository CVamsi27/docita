import { Injectable } from '@nestjs/common';
import { Appointment } from '@workspace/db';
import { FhirAppointment } from '../interfaces/fhir.interfaces';

@Injectable()
export class FhirAppointmentFactory {
  create(appointment: Appointment): FhirAppointment {
    const fhirAppointment: FhirAppointment = {
      resourceType: 'Appointment',
      id: appointment.id,
      meta: {
        lastUpdated: appointment.updatedAt.toISOString(),
        profile: ['http://hl7.org/fhir/StructureDefinition/Appointment'],
      },
      status: this.mapStatus(appointment.status),
      start: appointment.startTime.toISOString(),
      end: appointment.endTime.toISOString(),
      created: appointment.createdAt.toISOString(),
      description: appointment.chiefComplaint || appointment.type,
      participant: [
        {
          actor: { reference: `Patient/${appointment.patientId}` },
          status: 'accepted',
          type: [
            {
              coding: [
                {
                  system:
                    'http://terminology.hl7.org/CodeSystem/v3-ParticipationType',
                  code: 'PART',
                  display: 'Participation',
                },
              ],
            },
          ],
        },
        {
          actor: { reference: `Practitioner/${appointment.doctorId}` },
          status: 'accepted',
          type: [
            {
              coding: [
                {
                  system:
                    'http://terminology.hl7.org/CodeSystem/v3-ParticipationType',
                  code: 'PPRF',
                  display: 'primary performer',
                },
              ],
            },
          ],
        },
      ],
    };

    if (appointment.notes) {
      fhirAppointment.comment = appointment.notes;
    }

    return fhirAppointment;
  }

  createMany(appointments: Appointment[]): FhirAppointment[] {
    return appointments.map((appointment) => this.create(appointment));
  }

  private mapStatus(status: string): FhirAppointment['status'] {
    const s = status.toLowerCase();
    if (s === 'scheduled') return 'booked';
    if (s === 'completed') return 'fulfilled';
    if (s === 'cancelled') return 'cancelled';
    if (s === 'no_show' || s === 'noshow') return 'noshow';
    if (s === 'checked_in' || s === 'arrived') return 'arrived';
    return 'booked'; // Fallback
  }
}
