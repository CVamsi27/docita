import {
  Prisma,
  Appointment as PrismaAppointment,
  AppointmentStatus as PrismaAppointmentStatus,
} from '@workspace/db';
import { dentalChartSchema } from '@workspace/types';
import { Appointment } from '@/domains/appointments/core/entities/appointment.entity';
import {
  AppointmentStatus,
  AppointmentStatusEnum,
} from '@/domains/appointments/core/value-objects/appointment-status.value-object';
import { AppointmentListItem } from '@/domains/appointments/core/repositories/appointment.repository.interface';

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
      reason: raw.notes || undefined,
      notes: raw.notes || undefined,
      consultationNotes: raw.consultationNotes || undefined,
      observations: raw.observations || undefined,
      chiefComplaint: raw.chiefComplaint || undefined,
      treatmentHistory: raw.treatmentHistory || undefined,
      clinicalImpression: raw.clinicalImpression || undefined,
      differentialDiagnosis: raw.differentialDiagnosis || undefined,
      finalDiagnosis: raw.finalDiagnosis || undefined,
      followUpPlan: raw.followUpPlan || undefined,
      dentalChart: raw.dentalChart
        ? dentalChartSchema.parse(raw.dentalChart)
        : undefined,
      type: raw.type || undefined,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      version: raw.version,
    });
  }

  static toListItem(
    raw: PrismaAppointment & {
      patient?: {
        id: string;
        firstName: string;
        lastName: string;
        phoneNumber: string;
      } | null;
      doctor?: {
        id: string;
        name: string;
      } | null;
    },
  ): AppointmentListItem {
    const plain = AppointmentMapper.toDomain(raw).toPlain();
    return {
      ...plain,
      dentalChart: plain.dentalChart,
      patient: raw.patient
        ? {
            id: raw.patient.id,
            firstName: raw.patient.firstName,
            lastName: raw.patient.lastName,
            phoneNumber: raw.patient.phoneNumber,
          }
        : undefined,
      doctor: raw.doctor
        ? {
            id: raw.doctor.id,
            name: raw.doctor.name,
          }
        : undefined,
    };
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
      notes: plain.notes || plain.reason || null,
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
      ...(plain.dentalChart !== undefined
        ? { dentalChart: plain.dentalChart }
        : {}),
    };
  }
}
