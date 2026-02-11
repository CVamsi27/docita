import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  IPrescriptionRepository,
  PrescriptionSearchParams,
} from './prescription.repository.interface';
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

      where.createdAt = {
        gte: startDate,
        lte: endDate,
      };
    }

    return this.prisma.prescription.findMany({
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

  async findById(id: string): Promise<Prescription | null> {
    return this.prisma.prescription.findUnique({
      where: { id },
      include: {
        medications: true,
        patient: {
          select: {
            id: true,
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
                logo: true,
              },
            },
          },
        },
        doctor: {
          select: {
            id: true,
            name: true,
            email: true,
            qualification: true,
            registrationNumber: true,
            signatureUrl: true,
          },
        },
      },
    });
  }

  async create(data: Prisma.PrescriptionCreateInput): Promise<Prescription> {
    return this.prisma.prescription.create({
      data,
      include: {
        medications: true,
        patient: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          },
        },
      },
    });
  }

  async update(
    id: string,
    data: Prisma.PrescriptionUpdateInput,
  ): Promise<Prescription> {
    return this.prisma.prescription.update({
      where: { id },
      data,
      include: {
        medications: true, // Re-fetch query logic from service update if it had one? Service didn't have update method
        // PrescriptionsService actually does NOT have an update method in the file I viewed earlier (lines 1-336).
        // It has findAll, findOne, create, generatePDF.
        // Wait, let's double check PrescriptionsService content.
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.prescription.delete({ where: { id } });
  }

  async findPatientWithAllergies(patientId: string): Promise<any | null> {
    return this.prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        patientAllergies: {
          where: { allergyType: 'DRUG' },
          select: {
            allergen: true,
            allergyType: true,
            severity: true,
            reaction: true,
          },
        },
      },
    });
  }
}
