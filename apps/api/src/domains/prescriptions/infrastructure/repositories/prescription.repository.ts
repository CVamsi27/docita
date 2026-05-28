import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  IPrescriptionRepository,
  PrescriptionSearchParams,
  PrescriptionDetail,
  PatientWithAllergies,
  DoctorComplianceProfile,
} from '@/domains/prescriptions/core/repositories/prescription.repository.interface';
import { mapPrescriptionDetailRow } from '@/domains/prescriptions/infrastructure/repositories/prescription-detail.mapper';
import { Prescription, Prisma, Role } from '@workspace/db';

@Injectable()
export class PrismaPrescriptionRepository implements IPrescriptionRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getReadClient() {
    return this.prisma.getReadClient();
  }

  async findAll(params: PrescriptionSearchParams): Promise<Prescription[]> {
    const { clinicId, search, date, startDate, endDate, patientId, limit } =
      params;

    if (!clinicId) {
      return [];
    }

    const where: Prisma.PrescriptionWhereInput = {
      patient: { clinicId },
    };

    if (patientId) {
      where.patientId = patientId;
    }

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

    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      where.updatedAt = {
        gte: start,
        lte: end,
      };
    } else if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setHours(23, 59, 59, 999);

      where.updatedAt = {
        gte: start,
        lte: end,
      };
    }

    return await this.getReadClient().prescription.findMany({
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
            qualification: true,
            registrationNumber: true,
            signatureUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      ...(typeof limit === 'number' && limit > 0 ? { take: limit } : {}),
    });
  }

  async findById(
    id: string,
    clinicId: string,
  ): Promise<PrescriptionDetail | null> {
    const result = await this.getReadClient().prescription.findFirst({
      where: { id, patient: { clinicId } },
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
                logo: true,
                currency: true,
                branding: true,
              },
            },
          },
        },
        doctor: {
          select: {
            id: true,
            name: true,
            qualification: true,
            registrationNumber: true,
            signatureUrl: true,
          },
        },
        appointment: {
          select: {
            diagnoses: {
              select: {
                isPrimary: true,
                icdCode: {
                  select: { code: true, description: true, version: true },
                },
              },
            },
          },
        },
      },
    });

    return mapPrescriptionDetailRow(result);
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
    clinicId: string,
    expectedVersion?: number,
  ): Promise<Prescription> {
    // Optimistic-locking: if the caller passes an expected version, gate the
    // write on it so concurrent edits do not silently overwrite each other.
    // Callers that have not been migrated to pass a version still get a
    // monotonically-increasing version field, just without conflict detection.
    const result = await this.prisma.prescription.updateMany({
      where: {
        id,
        patient: { clinicId },
        ...(expectedVersion !== undefined ? { version: expectedVersion } : {}),
      },
      data: {
        ...data,
        version: { increment: 1 },
      } satisfies Prisma.PrescriptionUpdateManyMutationInput,
    });
    if (result.count === 0) {
      if (expectedVersion !== undefined) {
        throw new Error(
          `Prescription ${id} version conflict (expected ${expectedVersion})`,
        );
      }
      throw new Error(`Prescription ${id} not found`);
    }

    const refreshed = await this.prisma.prescription.findFirst({
      where: { id, patient: { clinicId } },
      include: { medications: true },
    });
    if (!refreshed) {
      throw new Error(`Prescription ${id} not found`);
    }
    return refreshed;
  }

  async delete(id: string, clinicId: string): Promise<void> {
    await this.prisma.prescription.deleteMany({
      where: { id, patient: { clinicId } },
    });
  }

  async findPatientWithAllergies(
    patientId: string,
    clinicId: string,
  ): Promise<PatientWithAllergies | null> {
    const patient = await this.getReadClient().patient.findFirst({
      where: { id: patientId, clinicId },
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
      patientAllergies: patient.patientAllergies.map((allergy) => ({
        allergen: allergy.allergen,
        allergyType: allergy.allergyType,
        severity: allergy.severity,
        reaction: allergy.reaction,
      })),
    };
  }

  async findDoctorCompliance(
    doctorId: string,
    clinicId?: string,
  ): Promise<DoctorComplianceProfile | null> {
    const doctor = await this.getReadClient().user.findFirst({
      where: {
        id: doctorId,
        role: { in: [Role.DOCTOR, Role.ADMIN_DOCTOR] },
        ...(clinicId
          ? {
              OR: [
                { clinicId },
                {
                  doctorClinics: {
                    some: {
                      clinicId,
                      active: true,
                    },
                  },
                },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        registrationNumber: true,
        licenseNumber: true,
        signatureUrl: true,
        verificationStatus: true,
      },
    });

    if (!doctor) {
      return null;
    }

    return doctor;
  }
}
