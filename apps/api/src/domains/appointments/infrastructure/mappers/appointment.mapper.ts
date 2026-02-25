import {
  Prisma,
  Appointment as PrismaAppointment,
  AppointmentStatus as PrismaAppointmentStatus,
} from '@workspace/db';
import { Appointment } from '../../core/entities/appointment.entity';
import {
  AppointmentStatus,
  AppointmentStatusEnum,
} from '../../core/value-objects/appointment-status.value-object';

export class AppointmentMapper {
  static toDomain(raw: PrismaAppointment): Appointment {
    return new Appointment({
      id: raw.id,
      clinicId: raw.clinicId,
      patientId: raw.patientId,
      doctorId: raw.doctorId,
      startTime: raw.startTime,
      endTime: raw.endTime,
      status: new AppointmentStatus(raw.status as AppointmentStatusEnum),
      notes: raw.notes || undefined,
      consultationNotes: raw.consultationNotes || undefined,
      observations: raw.observations || undefined,
      chiefComplaint: raw.chiefComplaint || undefined,
      treatmentHistory: raw.treatmentHistory || undefined,
      clinicalImpression: raw.clinicalImpression || undefined,
      differentialDiagnosis: raw.differentialDiagnosis || undefined,
      finalDiagnosis: raw.finalDiagnosis || undefined,
      followUpPlan: raw.followUpPlan || undefined,
      type: raw.type || undefined,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      version: raw.version,
    });
  }

  static toPersistence(domain: Appointment): any {
    const plain = domain.toPlain();

    return {
      id: plain.id,
      clinicId: plain.clinicId,
      patientId: plain.patientId,
      doctorId: plain.doctorId,
      startTime: plain.startTime,
      endTime: plain.endTime,
      status: plain.status as unknown as PrismaAppointmentStatus,
      notes: plain.notes || null,
      consultationNotes: plain.consultationNotes || null,
      observations: plain.observations || null,
      chiefComplaint: plain.chiefComplaint || null,
      treatmentHistory: plain.treatmentHistory || null,
      clinicalImpression: plain.clinicalImpression || null,
      differentialDiagnosis: plain.differentialDiagnosis || null,
      finalDiagnosis: plain.finalDiagnosis || null,
      followUpPlan: plain.followUpPlan || null,
      type: plain.type || '',
      createdAt: plain.createdAt,
      updatedAt: plain.updatedAt,
      version: plain.version,
    };
  }
}
