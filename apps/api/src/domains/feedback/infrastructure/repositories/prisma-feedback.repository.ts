import { Inject, Injectable } from '@nestjs/common';
import {
  CLOCK_PORT,
  type IClock,
} from '@/shared/common/ports/clock.port';
import { PrismaService } from '@/prisma/prisma.service';
import { FeedbackFeatureType } from '@workspace/db';
import {
  buildFeedbackWhereClause,
  type FeedbackFilters,
} from '@/domains/feedback/application/services/feedback-helpers';
import {
  CreateFeedbackData,
  FeedbackStatsCounts,
  IFeedbackRepository,
  UpdateFeedbackStatusData,
} from '@/domains/feedback/core/repositories/feedback.repository.interface';

const USER_PUBLIC_SELECT = {
  id: true,
  name: true,
  email: true,
} as const;

const USER_WITH_ROLE_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
} as const;

const CLINIC_SHORT_SELECT = {
  id: true,
  name: true,
} as const;

const CLINIC_WITH_TIER_SELECT = {
  id: true,
  name: true,
  tier: true,
} as const;

@Injectable()
export class PrismaFeedbackRepository implements IFeedbackRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  create(data: CreateFeedbackData) {
    return this.prisma.feedback.create({
      data: {
        clinicId: data.clinicId,
        userId: data.userId,
        overallRating: data.overallRating,
        goodFeatures: data.goodFeatures,
        goodFeaturesReason: data.goodFeaturesReason,
        badFeatures: data.badFeatures,
        badFeaturesReason: data.badFeaturesReason,
        improvementAreas: data.improvementAreas,
        improvementReason: data.improvementReason,
        featureRequests: data.featureRequests,
        generalComments: data.generalComments,
        category: data.category,
        status: 'NEW',
        ...(data.feedbackFeatures.length > 0
          ? {
              feedbackFeatures: {
                createMany: { data: data.feedbackFeatures },
              },
            }
          : {}),
      },
      include: {
        user: { select: USER_PUBLIC_SELECT },
        clinic: { select: CLINIC_SHORT_SELECT },
      },
    });
  }

  findAllForClinic(clinicId: string) {
    return this.prisma.feedback.findMany({
      where: { clinicId },
      include: {
        user: { select: USER_PUBLIC_SELECT },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findAll(filters: FeedbackFilters) {
    const where = buildFeedbackWhereClause(filters);
    return this.prisma.feedback.findMany({
      where,
      include: {
        user: { select: USER_WITH_ROLE_SELECT },
        clinic: { select: CLINIC_WITH_TIER_SELECT },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOneRaw(id: string) {
    return this.prisma.feedback.findUnique({
      where: { id },
      include: {
        user: { select: USER_WITH_ROLE_SELECT },
        clinic: { select: CLINIC_WITH_TIER_SELECT },
      },
    });
  }

  findByUser(userId: string) {
    return this.prisma.feedback.findMany({
      where: { userId },
      include: {
        clinic: { select: CLINIC_SHORT_SELECT },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  updateStatus(id: string, data: UpdateFeedbackStatusData) {
    return this.prisma.feedback.update({
      where: { id },
      data: {
        status: data.status,
        adminNotes: data.adminNotes,
      },
      include: {
        user: { select: USER_PUBLIC_SELECT },
        clinic: { select: CLINIC_SHORT_SELECT },
      },
    });
  }

  delete(id: string) {
    return this.prisma.feedback.delete({ where: { id } });
  }

  async computeStats(
    clinicId: string | undefined,
  ): Promise<FeedbackStatsCounts> {
    const where = clinicId ? { clinicId } : {};
    const featureBaseWhere = clinicId ? { clinicId } : {};

    const [
      total,
      byStatus,
      byCategory,
      avgRating,
      recentCount,
      topGood,
      topBad,
      topImprovement,
    ] = await Promise.all([
      this.prisma.feedback.count({ where }),
      this.prisma.feedback.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
      this.prisma.feedback.groupBy({
        by: ['category'],
        where,
        _count: true,
      }),
      this.prisma.feedback.aggregate({
        where,
        _avg: { overallRating: true },
      }),
      this.prisma.feedback.count({
        where: {
          ...where,
          createdAt: {
            gte: new Date(
              this.clock.now().getTime() - 7 * 24 * 60 * 60 * 1000,
            ),
          },
        },
      }),
      this.prisma.feedbackFeature.groupBy({
        by: ['feature'],
        where: { featureType: FeedbackFeatureType.GOOD, ...featureBaseWhere },
        _count: { feature: true },
        orderBy: { _count: { feature: 'desc' } },
        take: 10,
      }),
      this.prisma.feedbackFeature.groupBy({
        by: ['feature'],
        where: { featureType: FeedbackFeatureType.BAD, ...featureBaseWhere },
        _count: { feature: true },
        orderBy: { _count: { feature: 'desc' } },
        take: 10,
      }),
      this.prisma.feedbackFeature.groupBy({
        by: ['feature'],
        where: {
          featureType: FeedbackFeatureType.IMPROVEMENT,
          ...featureBaseWhere,
        },
        _count: { feature: true },
        orderBy: { _count: { feature: 'desc' } },
        take: 10,
      }),
    ]);

    return {
      total,
      byStatus: byStatus.map((s) => ({
        status: s.status,
        _count: typeof s._count === 'number' ? s._count : 0,
      })),
      byCategory: byCategory.map((c) => ({
        category: c.category,
        _count: typeof c._count === 'number' ? c._count : 0,
      })),
      avgRating: avgRating._avg.overallRating ?? null,
      recentCount,
      topGood: topGood.map((t) => ({
        feature: t.feature,
        count: t._count.feature,
      })),
      topBad: topBad.map((t) => ({
        feature: t.feature,
        count: t._count.feature,
      })),
      topImprovement: topImprovement.map((t) => ({
        feature: t.feature,
        count: t._count.feature,
      })),
    };
  }

  async hasFeedbackInWindow(
    userId: string,
    clinicId: string,
    sinceDate: Date,
  ): Promise<boolean> {
    const recent = await this.prisma.feedback.findFirst({
      where: {
        userId,
        clinicId,
        createdAt: { gte: sinceDate },
      },
    });
    return !!recent;
  }
}
