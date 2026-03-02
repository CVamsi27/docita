import {
  Prisma,
  Appointment as PrismaAppointment,
  AppointmentStatus as PrismaAppointmentStatus,
} from '@workspace/db';
import { Appointment } from '@/domains/appointments/core/entities/appointment.entity';
import {
  AppointmentStatus,
  AppointmentStatusEnum,
} from '@/domains/appointments/core/value-objects/appointment-status.value-object';

const PRISMA_TO_DOMAIN_STATUS: Record<
  PrismaAppointmentStatus,
  AppointmentStatusEnum
> = {
  [PrismaAppointmentStatus.SCHEDULED]: AppointmentStatusEnum.SCHEDULED,
  [PrismaAppointmentStatus.CONFIRMED]: AppointmentStatusEnum.CONFIRMED,
  [PrismaAppointmentStatus.RESCHEDULING]: AppointmentStatusEnum.CONFIRMED,
  [PrismaAppointmentStatus.IN_PROGRESS]: AppointmentStatusEnum.IN_PROGRESS,
  [PrismaAppointmentStatus.COMPLETED]: AppointmentStatusEnum.COMPLETED,
  [PrismaAppointmentStatus.CANCELLED]: AppointmentStatusEnum.CANCELLED,
  [PrismaAppointmentStatus.NO_SHOW]: AppointmentStatusEnum.NOSHOW,
};

const DOMAIN_TO_PRISMA_STATUS: Record<
  AppointmentStatusEnum,
  PrismaAppointmentStatus
> = {
  [AppointmentStatusEnum.SCHEDULED]: PrismaAppointmentStatus.SCHEDULED,
  [AppointmentStatusEnum.CONFIRMED]: PrismaAppointmentStatus.CONFIRMED,
  [AppointmentStatusEnum.ARRIVED]: PrismaAppointmentStatus.CONFIRMED,
  [AppointmentStatusEnum.IN_PROGRESS]: PrismaAppointmentStatus.IN_PROGRESS,
  [AppointmentStatusEnum.COMPLETED]: PrismaAppointmentStatus.COMPLETED,
  [AppointmentStatusEnum.CANCELLED]: PrismaAppointmentStatus.CANCELLED,
  [AppointmentStatusEnum.NOSHOW]: PrismaAppointmentStatus.NO_SHOW,
};

export class AppointmentMapper {
  static toDomain(raw: PrismaAppointment): Appointment {
    return new Appointment({
      id: raw.id,
      clinicId: raw.clinicId,
      patientId: raw.patientId,
      doctorId: raw.doctorId,
      startTime: raw.startTime,
      endTime: raw.endTime,
      status: new AppointmentStatus(PRISMA_TO_DOMAIN_STATUS[raw.status]),
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

  static toPersistence(
    domain: Appointment,
  ): Prisma.AppointmentUncheckedCreateInput {
    const plain = domain.toPlain();

    return {
      id: plain.id,
      clinicId: plain.clinicId,
      patientId: plain.patientId,
      doctorId: plain.doctorId,
      startTime: plain.startTime,
      endTime: plain.endTime,
      status: DOMAIN_TO_PRISMA_STATUS[plain.status],
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
