import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Patient } from '@workspace/types';
import { Gender } from '@workspace/db';
import {
  PATIENT_LIST_SELECT,
  PATIENT_DETAIL_SELECT,
} from '../common/select-fragments';
import { paginateWithCursor } from '../common/pagination.helper';

interface PatientTag {
  tag: string;
  color: string;
}

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
  tags?: PatientTag[];
}

@Injectable()
export class PatientsService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    clinicId: string,
    options?: {
      limit?: number;
      cursor?: string;
      search?: string;
    },
  ) {
    if (!clinicId) {
      return {
        items: [],
        nextCursor: undefined,
        hasMore: false,
        count: 0,
      };
    }

    const where: {
      clinicId: string;
      OR?: Array<{
        firstName?: { contains: string; mode: 'insensitive' };
        lastName?: { contains: string; mode: 'insensitive' };
        phoneNumber?: { contains: string };
        email?: { contains: string; mode: 'insensitive' };
      }>;
    } = { clinicId };

    // Add search filter if provided
    if (options?.search) {
      where.OR = [
        { firstName: { contains: options.search, mode: 'insensitive' } },
        { lastName: { contains: options.search, mode: 'insensitive' } },
        { phoneNumber: { contains: options.search } },
        { email: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    return paginateWithCursor({
      model: this.prisma.patient,
      cursor: options?.cursor,
      limit: options?.limit || 50,
      where,
      orderBy: { updatedAt: 'desc' },
      select: {
        ...PATIENT_LIST_SELECT,
        email: true, // Additional field for this view
        bloodGroup: true,
        updatedAt: true,
        tags: {
          select: {
            id: true,
            tag: true,
            color: true,
          },
        },
      },
    });
  }

  async findOne(id: string): Promise<Patient> {
    const patient = await this.prisma.patient.findUnique({
      where: { id },
      select: PATIENT_DETAIL_SELECT,
    });

    if (!patient) {
      throw new NotFoundException(`Patient with ID ${id} not found`);
    }

    return patient as unknown as Patient;
  }

  async create(createPatientDto: CreatePatientData) {
    // Convert dateOfBirth to proper Date object if it's a string
    const dateOfBirth =
      typeof createPatientDto.dateOfBirth === 'string'
        ? new Date(createPatientDto.dateOfBirth)
        : createPatientDto.dateOfBirth;

    return this.prisma.patient.create({
      data: {
        firstName: createPatientDto.firstName,
        lastName: createPatientDto.lastName,
        phoneNumber: createPatientDto.phoneNumber,
        email: createPatientDto.email,
        address: createPatientDto.address,
        gender: createPatientDto.gender as Gender,
        dateOfBirth,
        bloodGroup: createPatientDto.bloodGroup,
        allergies: createPatientDto.allergies,
        medicalHistory: createPatientDto.medicalHistory || [],
        clinicId: createPatientDto.clinicId,
        tags: createPatientDto.tags
          ? {
              create: createPatientDto.tags.map((tag: PatientTag) => ({
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
  }

  async update(
    id: string,
    data: Partial<Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>>,
  ): Promise<Patient> {
    const { tags, ...rest } = data;
    const patient = await this.prisma.patient.update({
      where: { id },
      data: {
        ...rest,
        ...(rest.gender && { gender: rest.gender.toUpperCase() as Gender }),
        ...(rest.dateOfBirth && { dateOfBirth: new Date(rest.dateOfBirth) }),
      },
    });
    return patient as unknown as Patient;
  }

  async remove(id: string): Promise<void> {
    await this.prisma.patient.delete({
      where: { id },
    });
  }

  async getAppointments(patientId: string) {
    const appointments = await this.prisma.appointment.findMany({
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
        createdAt: true,
        updatedAt: true,
        doctor: {
          select: {
            id: true,
            name: true,
          },
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
    return appointments;
  }

  async getDocuments(patientId: string) {
    const documents = await this.prisma.document.findMany({
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
    return documents;
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
}
