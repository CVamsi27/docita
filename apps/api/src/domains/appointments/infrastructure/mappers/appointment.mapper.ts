import {
  Prisma,
  Appointment as PrismaAppointment,
  AppointmentStatus as PrismaAppointmentStatus,
} from '@workspace/db';
import { z } from 'zod';
import {
  appointmentListItemResponseSchema,
  cardiologyExamDataSchema,
  clinicalInvestigationSchema,
  dentalChartSchema,
  dermatologyExamDataSchema,
  generalExaminationSchema,
  growthChartDataSchema,
  gynecologyExamDataSchema,
  ophthalmologyExamDataSchema,
  psychiatryExamDataSchema,
  systemicExaminationSchema,
} from '@workspace/types';
import { parsePrismaJsonColumn } from '@/shared/common/json/parse-prisma-json-column';
import { toPrismaInputJsonValue } from '@/shared/common/json/to-prisma-input-json-value';
import { pickAppointmentListPlainFields } from '@/domains/appointments/infrastructure/mappers/appointment-list-item.helpers';
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

const clinicalInvestigationsSchema = z.array(clinicalInvestigationSchema);

function coerceToDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

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
      generalExamination: parsePrismaJsonColumn(
        raw.generalExamination,
        generalExaminationSchema,
      ),
      systemicExamination: parsePrismaJsonColumn(
        raw.systemicExamination,
        systemicExaminationSchema,
      ),
      investigations: parsePrismaJsonColumn(
        raw.investigations,
        clinicalInvestigationsSchema,
      ),
      growthData: parsePrismaJsonColumn(raw.growthData, growthChartDataSchema),
      ophthalmologyExam: parsePrismaJsonColumn(
        raw.ophthalmologyExam,
        ophthalmologyExamDataSchema,
      ),
      cardiologyExam: parsePrismaJsonColumn(
        raw.cardiologyExam,
        cardiologyExamDataSchema,
      ),
      gynecologyExam: parsePrismaJsonColumn(
        raw.gynecologyExam,
        gynecologyExamDataSchema,
      ),
      dermatologyExam: parsePrismaJsonColumn(
        raw.dermatologyExam,
        dermatologyExamDataSchema,
      ),
      psychiatryExam: parsePrismaJsonColumn(
        raw.psychiatryExam,
        psychiatryExamDataSchema,
      ),
      dentalChart: parsePrismaJsonColumn(raw.dentalChart, dentalChartSchema),
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
    const parsed = appointmentListItemResponseSchema.parse({
      ...pickAppointmentListPlainFields(plain),
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
    });

    return {
      ...parsed,
      startTime: coerceToDate(parsed.startTime),
      endTime: coerceToDate(parsed.endTime),
      createdAt: coerceToDate(parsed.createdAt),
      updatedAt: coerceToDate(parsed.updatedAt),
      patient: parsed.patient
        ? {
            id: parsed.patient.id,
            firstName: parsed.patient.firstName,
            lastName: parsed.patient.lastName,
            phoneNumber: parsed.patient.phoneNumber ?? '',
          }
        : undefined,
      doctor: parsed.doctor
        ? {
            id: parsed.doctor.id,
            name: parsed.doctor.name ?? '',
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
            generalExamination: toPrismaInputJsonValue(plain.generalExamination),
          }
        : {}),
      ...(plain.systemicExamination !== undefined
        ? {
            systemicExamination: toPrismaInputJsonValue(plain.systemicExamination),
          }
        : {}),
      ...(plain.investigations !== undefined
        ? { investigations: toPrismaInputJsonValue(plain.investigations) }
        : {}),
      ...(plain.growthData !== undefined
        ? { growthData: toPrismaInputJsonValue(plain.growthData) }
        : {}),
      ...(plain.ophthalmologyExam !== undefined
        ? {
            ophthalmologyExam: toPrismaInputJsonValue(plain.ophthalmologyExam),
          }
        : {}),
      ...(plain.cardiologyExam !== undefined
        ? { cardiologyExam: toPrismaInputJsonValue(plain.cardiologyExam) }
        : {}),
      ...(plain.gynecologyExam !== undefined
        ? { gynecologyExam: toPrismaInputJsonValue(plain.gynecologyExam) }
        : {}),
      ...(plain.dermatologyExam !== undefined
        ? { dermatologyExam: toPrismaInputJsonValue(plain.dermatologyExam) }
        : {}),
      ...(plain.psychiatryExam !== undefined
        ? { psychiatryExam: toPrismaInputJsonValue(plain.psychiatryExam) }
        : {}),
      ...(plain.dentalChart !== undefined
        ? { dentalChart: plain.dentalChart }
        : {}),
    };
  }
}
