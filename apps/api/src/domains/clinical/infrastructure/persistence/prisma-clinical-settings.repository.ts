import { Injectable } from '@nestjs/common';
import { Prisma } from '@workspace/db';
import { PrismaService } from '@/prisma/prisma.service';
import { IClinicalSettingsRepository } from '@/domains/clinical/core/repositories/clinical-settings.repository.interface';

@Injectable()
export class PrismaClinicalSettingsRepository implements IClinicalSettingsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getClinicSettings(clinicId: string): Promise<Record<string, unknown>> {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { settings: true },
    });

    return clinic?.settings && typeof clinic.settings === 'object'
      ? Object.fromEntries(Object.entries(clinic.settings))
      : {};
  }

  async updateClinicSettings(
    clinicId: string,
    settings: Record<string, unknown>,
  ): Promise<void> {
    await this.prisma.clinic.update({
      where: { id: clinicId },
      data: { settings: settings as Prisma.InputJsonValue },
    });
  }
}
