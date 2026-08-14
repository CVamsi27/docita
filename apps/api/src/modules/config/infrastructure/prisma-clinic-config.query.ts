import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { ClinicTier } from '@workspace/db';
import {
  CLINIC_CONFIG_QUERY_TOKEN,
  IClinicConfigQuery,
} from '../core/clinic-config-query.port';

@Injectable()
class PrismaClinicConfigQuery implements IClinicConfigQuery {
  constructor(private readonly prisma: PrismaService) {}

  async findAppConfigById(
    id: string,
  ): Promise<{ settings: unknown; tier: ClinicTier } | null> {
    const clinic = await this.prisma.clinic.findUnique({
      where: { id },
      select: {
        settings: true,
        tier: true,
      },
    });
    if (!clinic) return null;
    return { settings: clinic.settings, tier: clinic.tier };
  }
}

export const CLINIC_CONFIG_QUERY_PROVIDER = {
  provide: CLINIC_CONFIG_QUERY_TOKEN,
  useClass: PrismaClinicConfigQuery,
};
