import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { ClinicTier, TierPricing } from '@workspace/db';
import { ITierPricingRepository } from '@/domains/billing/core/repositories/tier-pricing.repository';

@Injectable()
export class PrismaTierPricingRepository implements ITierPricingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findManyActive(): Promise<TierPricing[]> {
    return this.prisma.tierPricing.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    });
  }

  async findByTier(tier: ClinicTier): Promise<TierPricing | null> {
    return this.prisma.tierPricing.findUnique({
      where: { tier },
    });
  }
}
