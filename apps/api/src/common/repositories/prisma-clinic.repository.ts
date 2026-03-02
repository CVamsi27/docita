import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  IClinicRepository,
  ClinicFilter,
  ClinicWithRelations,
} from './clinic.repository.interface';
import { Clinic, ClinicTier, SubscriptionStatus, Prisma } from '@workspace/db';

@Injectable()
export class PrismaClinicRepository implements IClinicRepository {
  constructor(private prisma: PrismaService) {}

  async findById(id: string): Promise<Clinic | null> {
    return this.prisma.clinic.findUnique({
      where: { id },
    });
  }

  async findByIdWithRelations(
    id: string,
    include?: Prisma.ClinicInclude,
  ): Promise<ClinicWithRelations | null> {
    return this.prisma.clinic.findUnique({
      where: { id },
      include: include ?? {
        users: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    }) as Promise<ClinicWithRelations | null>;
  }

  async findAll(filter?: ClinicFilter): Promise<Clinic[]> {
    const where: Prisma.ClinicWhereInput = {};

    if (filter?.tier) {
      where.tier = filter.tier;
    }

    if (filter?.subscriptionStatus) {
      where.subscriptionStatus = filter.subscriptionStatus;
    }

    if (filter?.search) {
      where.name = {
        contains: filter.search,
        mode: 'insensitive',
      };
    }

    if (filter?.isActive !== undefined) {
      where.subscriptionStatus = filter.isActive
        ? { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] }
        : { notIn: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] };
    }

    return this.prisma.clinic.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findPaginated(params: {
    page: number;
    limit: number;
    filter?: ClinicFilter;
  }): Promise<{
    data: Clinic[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const { page, limit, filter } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.ClinicWhereInput = this.buildWhereClause(filter);

    const [total, data] = await Promise.all([
      this.prisma.clinic.count({ where }),
      this.prisma.clinic.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async create(data: Prisma.ClinicCreateInput): Promise<Clinic> {
    return this.prisma.clinic.create({ data });
  }

  async update(id: string, data: Prisma.ClinicUpdateInput): Promise<Clinic> {
    return this.prisma.clinic.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.clinic.update({
      where: { id },
      data: {
        subscriptionStatus: SubscriptionStatus.CANCELLED,
      },
    });
  }

  async getSubscriptionStats(): Promise<{
    total: number;
    byTier: Record<ClinicTier, number>;
    byStatus: Record<SubscriptionStatus, number>;
    activeCount: number;
  }> {
    const [tierStats, statusStats, total] = await Promise.all([
      this.prisma.clinic.groupBy({
        by: ['tier'],
        _count: { id: true },
      }),
      this.prisma.clinic.groupBy({
        by: ['subscriptionStatus'],
        _count: { id: true },
      }),
      this.prisma.clinic.count(),
    ]);

    const byTier = {} as Record<ClinicTier, number>;
    tierStats.forEach((stat) => {
      byTier[stat.tier] = stat._count.id;
    });

    const byStatus = {} as Record<SubscriptionStatus, number>;
    statusStats.forEach((stat) => {
      byStatus[stat.subscriptionStatus] = stat._count.id;
    });

    const activeCount =
      (byStatus[SubscriptionStatus.ACTIVE] || 0) +
      (byStatus[SubscriptionStatus.TRIALING] || 0);

    return { total, byTier, byStatus, activeCount };
  }

  async findExpiringSubscriptions(daysUntilExpiry: number): Promise<Clinic[]> {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + daysUntilExpiry);

    return this.prisma.clinic.findMany({
      where: {
        subscriptionStatus: {
          in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING],
        },
        subscription: {
          currentPeriodEnd: {
            lte: expiryDate,
            gte: new Date(),
          },
        },
      },
      include: {
        users: {
          where: { role: 'ADMIN' },
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
  }

  private buildWhereClause(filter?: ClinicFilter): Prisma.ClinicWhereInput {
    const where: Prisma.ClinicWhereInput = {};

    if (filter?.tier) {
      where.tier = filter.tier;
    }

    if (filter?.subscriptionStatus) {
      where.subscriptionStatus = filter.subscriptionStatus;
    }

    if (filter?.search) {
      where.name = {
        contains: filter.search,
        mode: 'insensitive',
      };
    }

    if (filter?.isActive !== undefined) {
      where.subscriptionStatus = filter.isActive
        ? { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] }
        : { notIn: [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIALING] };
    }

    return where;
  }
}
