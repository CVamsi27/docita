import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Patient } from '@workspace/types';
import { Gender, AppointmentStatus, InvoiceStatus } from '@workspace/db';
import {
  BaseRepository,
  PaginationOptions,
  PaginatedResult,
} from './base.repository';
import {
  PATIENT_LIST_SELECT,
  PATIENT_DETAIL_SELECT,
} from '@/common/select-fragments';

interface CreatePatientData {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email?: string;
  address?: string;
  gender: string;
  dateOfBirth: Date | string;
  bloodGroup?: string;
  allergies?: string;
  medicalHistory?: string[];
  clinicId: string;
  tags?: { tag: string; color: string }[];
}

@Injectable()
export class PatientsRepository extends BaseRepository<
  Patient,
  CreatePatientData
> {
  constructor(prisma: PrismaService) {
    super(prisma, 'patient');
  }

  private toRecord(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object') {
      return {};
    }

    return Object.fromEntries(Object.entries(value));
  }

  protected getSearchFields(): string[] {
    return ['firstName', 'lastName', 'phoneNumber', 'email'];
  }

  protected getDefaultSelect() {
    return {
      ...PATIENT_LIST_SELECT,
      email: true,
      bloodGroup: true,
      updatedAt: true,
      tags: {
        select: {
          id: true,
          tag: true,
          color: true,
        },
      },
    };
  }

  protected getDetailSelect() {
    return PATIENT_DETAIL_SELECT;
  }

  async findAll(
    clinicId: string,
    options?: PaginationOptions,
  ): Promise<PaginatedResult<Patient>> {
    if (!clinicId) {
      return { items: [], hasMore: false, count: 0 };
    }

    const limit = options?.limit ?? 50;

    const where: Record<string, unknown> = {
      clinicId,
      deletedAt: null,
    };

    if (options?.search) {
      where.OR = this.buildSearchConditions(options.search);
    }

    const items = await this.prisma.patient.findMany({
      where,
      take: limit + 1,
      skip: options?.cursor ? 1 : 0,
      cursor: options?.cursor ? { id: options.cursor } : undefined,
      orderBy: { updatedAt: 'desc' },
      select: this.getDefaultSelect(),
    });

    const hasMore = items.length > limit;
    const resultItems = hasMore ? items.slice(0, -1) : items;

    return {
      items: this.toPatientArray(resultItems),
      hasMore,
      nextCursor: hasMore ? resultItems[resultItems.length - 1]?.id : undefined,
      count: resultItems.length,
    };
  }

  async findOne(id: string): Promise<Patient | null> {
    const patient = await this.prisma.patient.findFirst({
      where: {
        id,
        deletedAt: null,
      },
      select: this.getDetailSelect(),
    });
    return this.toPatientOrNull(patient);
  }

  async findOneOrFail(id: string): Promise<Patient> {
    const patient = await this.findOne(id);
    if (!patient) {
      throw new NotFoundException(`Patient with ID ${id} not found`);
    }
    return patient;
  }

  async create(data: CreatePatientData): Promise<Patient> {
    const dateOfBirth =
      typeof data.dateOfBirth === 'string'
        ? new Date(data.dateOfBirth)
        : data.dateOfBirth;

    const patient = await this.prisma.patient.create({
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        phoneNumber: data.phoneNumber,
        email: data.email || undefined,
        address: data.address,
        gender: data.gender as Gender,
        dateOfBirth,
        bloodGroup: data.bloodGroup,
        allergies: data.allergies,
        medicalHistory: data.medicalHistory || [],
        clinicId: data.clinicId,
        tags: data.tags
          ? {
              create: data.tags.map((tag) => ({
                tag: tag.tag,
                color: tag.color,
              })),
            }
          : undefined,
      },
      include: {
        tags: true,
      },
    });

    return this.toPatient(patient);
  }

  async update(
    id: string,
    data: Partial<Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<Patient> {
    type StructuredHistoryItem = {
      id?: string;
      patientId?: string;
      [key: string]: unknown;
    };

    const rawData = this.toRecord(data);

    const {
      tags,
      medicalConditions,
      patientAllergies,
      familyHistory,
      surgicalHistory,
      socialHistory,
      ...rest
    } = rawData;

    const normalizeStructuredHistoryList = (
      value: unknown,
    ): StructuredHistoryItem[] | undefined => {
      if (!Array.isArray(value)) {
        return undefined;
      }

      return value.filter(
        (item): item is StructuredHistoryItem =>
          !!item && typeof item === 'object',
      );
    };

    const normalizeStructuredHistoryRecord = (
      value: unknown,
    ): StructuredHistoryItem | undefined => {
      if (!value || typeof value !== 'object') {
        return undefined;
      }

      return value as StructuredHistoryItem;
    };

    const medicalConditionsList =
      normalizeStructuredHistoryList(medicalConditions);
    const patientAllergiesList =
      normalizeStructuredHistoryList(patientAllergies);
    const familyHistoryList = normalizeStructuredHistoryList(familyHistory);
    const surgicalHistoryList = normalizeStructuredHistoryList(surgicalHistory);
    const socialHistoryRecord = normalizeStructuredHistoryRecord(socialHistory);

    const updateData: Record<string, unknown> = {
      ...rest,
      ...(typeof rest.gender === 'string' && {
        gender: rest.gender.toUpperCase() as Gender,
      }),
      ...(typeof rest.dateOfBirth === 'string' && {
        dateOfBirth: new Date(rest.dateOfBirth),
      }),
    };

    if (medicalConditionsList) {
      updateData.medicalConditions = {
        deleteMany: {},
        create: medicalConditionsList.map(
          ({ id, patientId, ...item }: StructuredHistoryItem) => item,
        ),
      };
    }

    if (patientAllergiesList) {
      updateData.patientAllergies = {
        deleteMany: {},
        create: patientAllergiesList.map(
          ({ id, patientId, ...item }: StructuredHistoryItem) => item,
        ),
      };
    }

    if (familyHistoryList) {
      updateData.familyHistory = {
        deleteMany: {},
        create: familyHistoryList.map(
          ({ id, patientId, ...item }: StructuredHistoryItem) => item,
        ),
      };
    }

    if (surgicalHistoryList) {
      updateData.surgicalHistory = {
        deleteMany: {},
        create: surgicalHistoryList.map(
          ({ id, patientId, ...item }: StructuredHistoryItem) => item,
        ),
      };
    }

    if (socialHistoryRecord) {
      const { id, patientId, ...socialData } = socialHistoryRecord;
      updateData.socialHistory = {
        upsert: {
          create: socialData,
          update: socialData,
        },
      };
    }

    const patient = await this.prisma.patient.update({
      where: { id },
      data: updateData,
    });
    return this.toPatient(patient);
  }

  private toPatient(value: unknown): Patient {
    return value as Patient;
  }

  private toPatientOrNull(value: unknown): Patient | null {
    return value as Patient | null;
  }

  private toPatientArray(value: unknown[]): Patient[] {
    return value as Patient[];
  }

  async delete(id: string): Promise<void> {
    await this.prisma.patient.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  async getAppointments(patientId: string) {
    return this.prisma.appointment.findMany({
      where: { patientId },
      select: {
        id: true,
        patientId: true,
        doctorId: true,
        clinicId: true,
        startTime: true,
        endTime: true,
        status: true,
        type: true,
        notes: true,
        observations: true,
        consultationNotes: true,
        chiefComplaint: true,
        provisionalDiagnosis: true,
        treatmentPlan: true,
        createdAt: true,
        updatedAt: true,
        doctor: {
          select: {
            id: true,
            name: true,
          },
        },
        diagnoses: {
          select: {
            id: true,
            icdCodeId: true,
            notes: true,
            isPrimary: true,
            createdAt: true,
            icdCode: {
              select: {
                id: true,
                code: true,
                description: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' as const },
        },
        vitalSign: true,
        prescription: {
          select: {
            id: true,
            instructions: true,
            createdAt: true,
            medications: true,
          },
        },
        invoice: {
          select: {
            id: true,
            total: true,
            status: true,
            items: true,
            createdAt: true,
          },
        },
      },
      orderBy: { startTime: 'desc' },
    });
  }

  async getStatistics(patientId: string) {
    const appointments = await this.prisma.appointment.findMany({
      where: { patientId },
      select: {
        id: true,
        status: true,
        startTime: true,
        endTime: true,
      },
      orderBy: { startTime: 'desc' },
    });

    const now = new Date();
    const completedAppointments = appointments.filter(
      (apt) => apt.status === AppointmentStatus.COMPLETED,
    );
    const scheduledAppointments = appointments.filter(
      (apt) =>
        apt.status === AppointmentStatus.SCHEDULED ||
        apt.status === AppointmentStatus.CONFIRMED,
    );

    const totalVisits = completedAppointments.length;

    const lastVisit =
      completedAppointments.length > 0
        ? completedAppointments[0].startTime
        : null;

    const upcomingAppointments = scheduledAppointments.filter(
      (apt) => new Date(apt.startTime) > now,
    );
    upcomingAppointments.sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );
    const nextVisit =
      upcomingAppointments.length > 0
        ? upcomingAppointments[0].startTime
        : null;

    const noShowAppointments = appointments.filter(
      (apt) => apt.status === AppointmentStatus.NO_SHOW,
    ).length;
    const cancelledAppointments = appointments.filter(
      (apt) => apt.status === AppointmentStatus.CANCELLED,
    ).length;

    const totalRelevantAppointments =
      totalVisits + noShowAppointments + cancelledAppointments;

    const adherenceRate =
      totalRelevantAppointments > 0
        ? Math.round((totalVisits / totalRelevantAppointments) * 100)
        : 0;

    return {
      totalVisits,
      lastVisit,
      nextVisit,
      adherenceRate,
      totalAppointments: appointments.length,
      scheduledAppointments: scheduledAppointments.length,
      noShowCount: noShowAppointments,
      cancelledCount: cancelledAppointments,
    };
  }

  async getDocuments(patientId: string) {
    return this.prisma.document.findMany({
      where: { patientId },
      select: {
        id: true,
        name: true,
        type: true,
        url: true,
        fileSize: true,
        mimeType: true,
        description: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTags(patientId: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      select: {
        tags: {
          select: {
            id: true,
            tag: true,
            color: true,
          },
        },
      },
    });

    if (!patient) {
      throw new NotFoundException(`Patient with ID ${patientId} not found`);
    }

    return patient.tags;
  }

  async getMedicalHistoryTimeline(patientId: string) {
    const appointments = await this.prisma.appointment.findMany({
      where: {
        patientId,
        status: {
          in: [AppointmentStatus.COMPLETED, AppointmentStatus.IN_PROGRESS],
        },
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        status: true,
        type: true,
        chiefComplaint: true,
        encounterSummary: true,
        provisionalDiagnosis: true,
        finalDiagnosis: true,
        clinicalImpression: true,
        treatmentPlan: true,
        observations: true,
        notes: true,
        doctor: {
          select: {
            id: true,
            name: true,
            specialization: true,
          },
        },
        diagnoses: {
          select: {
            id: true,
            isPrimary: true,
            notes: true,
            icdCode: {
              select: {
                id: true,
                code: true,
                description: true,
              },
            },
          },
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
        },
        vitalSign: {
          select: {
            id: true,
            systolicBP: true,
            diastolicBP: true,
            bloodPressure: true,
            pulse: true,
            temperature: true,
            spo2: true,
            weight: true,
            height: true,
          },
        },
        prescription: {
          select: {
            id: true,
            medications: {
              select: {
                id: true,
                name: true,
                dosage: true,
                frequency: true,
                duration: true,
              },
            },
          },
        },
      },
      orderBy: { startTime: 'desc' },
    });

    return appointments.map((apt) => ({
      ...apt,

      issueSummary:
        apt.encounterSummary ||
        apt.chiefComplaint ||
        apt.finalDiagnosis ||
        apt.provisionalDiagnosis ||
        'General consultation',

      primaryDiagnosis:
        apt.diagnoses.find((d) => d.isPrimary) || apt.diagnoses[0] || null,

      yearMonth: new Date(apt.startTime).toISOString().slice(0, 7),
    }));
  }
}
