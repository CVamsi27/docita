import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  IPrescriptionRepository,
  PrescriptionSearchParams,
  PrescriptionDetail,
  PatientWithAllergies,
} from '../../core/repositories/prescription.repository.interface';
import { Prescription, Prisma } from '@workspace/db';

@Injectable()
export class PrismaPrescriptionRepository implements IPrescriptionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: PrescriptionSearchParams): Promise<Prescription[]> {
    const { clinicId, search, date } = params;

    if (!clinicId) {
      return [];
    }

    const where: Prisma.PrescriptionWhereInput = {
      patient: { clinicId },
    };

    if (search) {
      where.OR = [
        {
          patient: {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
        {
          medications: {
            some: {
              name: { contains: search, mode: 'insensitive' },
            },
          },
        },
      ];
    }

    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(startDate);
      endDate.setHours(23, 59, 59, 999);

      where.updatedAt = {
        gte: startDate,
        lte: endDate,
      };
    }

    return await this.prisma.prescription.findMany({
      where,
      include: {
        medications: true,
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            gender: true,
            dateOfBirth: true,
          },
        },
        doctor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string): Promise<PrescriptionDetail | null> {
    const result = await this.prisma.prescription.findUnique({
      where: { id },
      include: {
        medications: true,
        patient: {
          select: {
            id: true,
            mrn: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            email: true,
            gender: true,
            dateOfBirth: true,
            clinic: {
              select: {
                id: true,
                name: true,
                address: true,
                phone: true,
                email: true,
              },
            },
          },
        },
        doctor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return result as PrescriptionDetail | null;
  }

  async create(data: Prisma.PrescriptionCreateInput): Promise<Prescription> {
    return await this.prisma.prescription.create({
      data,
      include: { medications: true },
    });
  }

  async update(
    id: string,
    data: Prisma.PrescriptionUpdateInput,
  ): Promise<Prescription> {
    return await this.prisma.prescription.update({
      where: { id },
      data,
      include: { medications: true },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.prescription.delete({ where: { id } });
  }

  async findPatientWithAllergies(
    patientId: string,
  ): Promise<PatientWithAllergies | null> {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      select: {
        id: true,
        patientAllergies: {
          select: {
            allergen: true,
            allergyType: true,
            severity: true,
            reaction: true,
          },
        },
      },
    });

    if (!patient) return null;

    return {
      id: patient.id,
      patientAllergies: patient.patientAllergies as Array<{
        allergen: string;
        allergyType: string;
        severity: string;
        reaction: string | null;
      }>,
    };
  }
}
