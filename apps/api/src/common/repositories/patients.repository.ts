import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Patient } from '@workspace/types';
import { Gender } from '@workspace/db';
import {
  BaseRepository,
  PaginationOptions,
  PaginatedResult,
} from './base.repository';
import {
  PATIENT_LIST_SELECT,
  PATIENT_DETAIL_SELECT,
} from '../select-fragments';

/**
 * DTO for creating patients
 */
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

/**
 * Repository for Patient entity.
 * Handles all data access for patients.
 */
@Injectable()
export class PatientsRepository extends BaseRepository<Patient> {
  constructor(prisma: PrismaService) {
    super(prisma, 'patient');
  }

  /**
   * Searchable fields for patients
   */
  protected getSearchFields(): string[] {
    return ['firstName', 'lastName', 'phoneNumber', 'email'];
  }

  /**
   * Default select for list views
   */
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

  /**
   * Detail select for single patient views
   */
  protected getDetailSelect() {
    return PATIENT_DETAIL_SELECT;
  }

  /**
   * Find all patients with customized pagination
   */
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
      items: resultItems as unknown as Patient[],
      hasMore,
      nextCursor: hasMore ? resultItems[resultItems.length - 1]?.id : undefined,
      count: resultItems.length,
    };
  }

  /**
   * Find a single patient by ID
   */
  async findOne(id: string): Promise<Patient | null> {
    const patient = await this.prisma.patient.findUnique({
      where: { id },
      select: this.getDetailSelect(),
    });
    return patient as unknown as Patient | null;
  }

  /**
   * Find patient or throw NotFoundException
   */
  async findOneOrFail(id: string): Promise<Patient> {
    const patient = await this.findOne(id);
    if (!patient) {
      throw new NotFoundException(`Patient with ID ${id} not found`);
    }
    return patient;
  }

  /**
   * Create a new patient
   */
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

    return patient as unknown as Patient;
  }

  /**
   * Update a patient
   */
  async update(
    id: string,
    data: Partial<Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<Patient> {
    const {
      tags,
      medicalConditions,
      patientAllergies,
      familyHistory,
      surgicalHistory,
      socialHistory,
      ...rest
    } = data as any; // Cast to access structured fields not yet in interface

    const updateData: any = {
      ...rest,
      ...(rest.gender && { gender: rest.gender.toUpperCase() as Gender }),
      ...(rest.dateOfBirth && {
        dateOfBirth: new Date(rest.dateOfBirth as string),
      }),
    };

    // Handle structured medical history (Replace Strategy for arrays)
    if (medicalConditions) {
      updateData.medicalConditions = {
        deleteMany: {},
        create: medicalConditions.map(
          ({ id, patientId, ...item }: any) => item,
        ),
      };
    }

    if (patientAllergies) {
      updateData.patientAllergies = {
        deleteMany: {},
        create: patientAllergies.map(({ id, patientId, ...item }: any) => item),
      };
    }

    if (familyHistory) {
      updateData.familyHistory = {
        deleteMany: {},
        create: familyHistory.map(({ id, patientId, ...item }: any) => item),
      };
    }

    if (surgicalHistory) {
      updateData.surgicalHistory = {
        deleteMany: {},
        create: surgicalHistory.map(({ id, patientId, ...item }: any) => item),
      };
    }

    if (socialHistory) {
      const { id, patientId, ...socialData } = socialHistory;
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
    return patient as unknown as Patient;
  }

  /**
   * Delete a patient
   */
  async delete(id: string): Promise<void> {
    await this.prisma.patient.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  /**
   * Get all appointments for a patient
   */
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

  /**
   * Get patient statistics including visit counts, adherence, etc.
   */
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
      (apt) => apt.status === 'completed',
    );
    const scheduledAppointments = appointments.filter(
      (apt) => apt.status === 'scheduled' || apt.status === 'confirmed',
    );

    // Calculate total visits (completed appointments)
    const totalVisits = completedAppointments.length;

    // Find last visit (most recent completed appointment)
    const lastVisit =
      completedAppointments.length > 0
        ? completedAppointments[0].startTime
        : null;

    // Find next visit (next scheduled/confirmed appointment in the future)
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

    // Calculate adherence rate
    // Adherence = completed / (completed + no-show + cancelled)
    const noShowAppointments = appointments.filter(
      (apt) => apt.status === 'no-show',
    ).length;
    const cancelledAppointments = appointments.filter(
      (apt) => apt.status === 'cancelled',
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

  /**
   * Get all documents for a patient
   */
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

  /**
   * Get all tags for a patient
   */
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

  /**
   * Get complete medical history timeline for a patient
   * Returns all appointments with issue summaries (chiefComplaint/encounterSummary/finalDiagnosis),
   * ICD-10 diagnoses, doctor info, and dates - ordered chronologically
   */
  async getMedicalHistoryTimeline(patientId: string) {
    const appointments = await this.prisma.appointment.findMany({
      where: {
        patientId,
        status: { in: ['completed', 'in-progress', 'checked-in'] },
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

    // Transform to include computed summary
    return appointments.map((apt) => ({
      ...apt,
      // Computed summary: prefer encounterSummary, then chiefComplaint, then finalDiagnosis
      issueSummary:
        apt.encounterSummary ||
        apt.chiefComplaint ||
        apt.finalDiagnosis ||
        apt.provisionalDiagnosis ||
        'General consultation',
      // Primary diagnosis for quick display
      primaryDiagnosis:
        apt.diagnoses.find((d) => d.isPrimary) || apt.diagnoses[0] || null,
      // Year-month grouping key
      yearMonth: new Date(apt.startTime).toISOString().slice(0, 7),
    }));
  }
}
