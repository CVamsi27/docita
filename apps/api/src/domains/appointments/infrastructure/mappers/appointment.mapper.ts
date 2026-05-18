import {
  Prisma,
  Appointment as PrismaAppointment,
  AppointmentStatus as PrismaAppointmentStatus,
} from '@workspace/db';
import {
  appointmentListItemResponseSchema,
  dentalChartSchema,
} from '@workspace/types';
import { Appointment } from '@/domains/appointments/core/entities/appointment.entity';
import {
  AppointmentStatus,
  AppointmentStatusEnum,
} from '@/domains/appointments/core/value-objects/appointment-status.value-object';
import { AppointmentListItem } from '@/domains/appointments/core/repositories/appointment.repository.interface';

export const PRISMA_TO_DOMAIN_STATUS: Record<
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

/** Keys allowed on list responses; keeps `appointmentListItemResponseSchema.strict()` in sync. */
const APPOINTMENT_LIST_ITEM_ROOT_KEYS = Object.keys(
  appointmentListItemResponseSchema.omit({ patient: true, doctor: true }).shape,
);

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
      historyOfPresentIllness: raw.historyOfPresentIllness || undefined,
      pastMedicalHistory: raw.pastMedicalHistory || undefined,
      reviewOfSystems: raw.reviewOfSystems || undefined,
      provisionalDiagnosis: raw.provisionalDiagnosis || undefined,
      treatmentHistory: raw.treatmentHistory || undefined,
      treatmentPlan: raw.treatmentPlan || undefined,
      clinicalImpression: raw.clinicalImpression || undefined,
      differentialDiagnosis: raw.differentialDiagnosis || undefined,
      finalDiagnosis: raw.finalDiagnosis || undefined,
      followUpPlan: raw.followUpPlan || undefined,
      generalExamination: raw.generalExamination ?? undefined,
      systemicExamination: raw.systemicExamination ?? undefined,
      investigations: raw.investigations ?? undefined,
      growthData: raw.growthData ?? undefined,
      ophthalmologyExam: raw.ophthalmologyExam ?? undefined,
      cardiologyExam: raw.cardiologyExam ?? undefined,
      gynecologyExam: raw.gynecologyExam ?? undefined,
      dermatologyExam: raw.dermatologyExam ?? undefined,
      psychiatryExam: raw.psychiatryExam ?? undefined,
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
    const item: Record<string, unknown> = {};
    for (const key of APPOINTMENT_LIST_ITEM_ROOT_KEYS) {
      if (!Object.prototype.hasOwnProperty.call(plain, key)) {
        continue;
      }
      item[key] = plain[key as keyof typeof plain];
    }
    return {
      ...item,
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
    } as AppointmentListItem;
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
      status: DOMAIN_TO_PRISMA_STATUS[domain.getStatus().getValue()],
      notes: plain.notes || plain.reason || null,
      consultationNotes: plain.consultationNotes || null,
      observations: plain.observations || null,
      chiefComplaint: plain.chiefComplaint || null,
      historyOfPresentIllness: plain.historyOfPresentIllness || null,
      pastMedicalHistory: plain.pastMedicalHistory || null,
      reviewOfSystems: plain.reviewOfSystems || null,
      provisionalDiagnosis: plain.provisionalDiagnosis || null,
      treatmentHistory: plain.treatmentHistory || null,
      treatmentPlan: plain.treatmentPlan || null,
      clinicalImpression: plain.clinicalImpression || null,
      differentialDiagnosis: plain.differentialDiagnosis || null,
      finalDiagnosis: plain.finalDiagnosis || null,
      followUpPlan: plain.followUpPlan || null,
      type: plain.type || '',
      createdAt: plain.createdAt,
      updatedAt: plain.updatedAt,
      version: plain.version,
      ...(plain.generalExamination !== undefined
        ? {
            generalExamination:
              plain.generalExamination as Prisma.InputJsonValue,
          }
        : {}),
      ...(plain.systemicExamination !== undefined
        ? {
            systemicExamination:
              plain.systemicExamination as Prisma.InputJsonValue,
          }
        : {}),
      ...(plain.investigations !== undefined
        ? { investigations: plain.investigations as Prisma.InputJsonValue }
        : {}),
      ...(plain.growthData !== undefined
        ? { growthData: plain.growthData as Prisma.InputJsonValue }
        : {}),
      ...(plain.ophthalmologyExam !== undefined
        ? {
            ophthalmologyExam: plain.ophthalmologyExam as Prisma.InputJsonValue,
          }
        : {}),
      ...(plain.cardiologyExam !== undefined
        ? { cardiologyExam: plain.cardiologyExam as Prisma.InputJsonValue }
        : {}),
      ...(plain.gynecologyExam !== undefined
        ? { gynecologyExam: plain.gynecologyExam as Prisma.InputJsonValue }
        : {}),
      ...(plain.dermatologyExam !== undefined
        ? {
            dermatologyExam: plain.dermatologyExam as Prisma.InputJsonValue,
          }
        : {}),
      ...(plain.psychiatryExam !== undefined
        ? { psychiatryExam: plain.psychiatryExam as Prisma.InputJsonValue }
        : {}),
      ...(plain.dentalChart !== undefined
        ? { dentalChart: plain.dentalChart }
        : {}),
    };
  }
}
