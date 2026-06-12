import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import type { IAbhaVerificationStore } from '@/domains/patients/core/ports/abha-verification.port';

@Injectable()
export class PrismaAbhaVerificationStore implements IAbhaVerificationStore {
  constructor(private readonly prisma: PrismaService) {}

  async isClinicAbdmEnabled(clinicId: string): Promise<boolean> {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { abdmEnabled: true },
    });
    return clinic?.abdmEnabled === true;
  }

  async findPatientForVerification(patientId: string, clinicId: string) {
    return this.prisma.patient.findFirst({
      where: { id: patientId, clinicId, deletedAt: null },
      select: { id: true, abhaAddress: true },
    });
  }

  async saveVerification(
    patientId: string,
    clinicId: string,
    data: {
      abhaAddress: string | null;
      abhaNumber: string | null;
      abhaKycName: string | null;
      abhaVerifiedAt: Date;
    },
  ): Promise<void> {
    await this.prisma.patient.updateMany({
      where: { id: patientId, clinicId },
      data: {
        abhaAddress: data.abhaAddress ?? undefined,
        abhaNumber: data.abhaNumber ?? undefined,
        abhaKycName: data.abhaKycName ?? undefined,
        abhaVerifiedAt: data.abhaVerifiedAt,
      },
    });
  }
}
