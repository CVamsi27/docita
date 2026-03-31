import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  Prisma,
  FeedbackCategory,
  FeedbackFeatureType,
  FeedbackStatus,
} from '@workspace/db';

interface CreateFeedbackDto {
  overallRating: number;
  goodFeatures?: string[];
  goodFeaturesReason?: string;
  badFeatures?: string[];
  badFeaturesReason?: string;
  improvementAreas?: string[];
  improvementReason?: string;
  featureRequests?: string;
  generalComments?: string;
  category?: string;
}

interface UpdateFeedbackStatusDto {
  status: string;
  adminNotes?: string;
}

interface FeedbackFilters {
  status?: string;
  category?: string;
  clinicId?: string;
  startDate?: string;
  endDate?: string;
  minRating?: number;
  maxRating?: number;
  search?: string;
}

@Injectable()
export class FeedbackService {
  constructor(private prisma: PrismaService) {}

  async create(clinicId: string, userId: string, data: CreateFeedbackDto) {
    const goodFeatures = data.goodFeatures || [];
    const badFeatures = data.badFeatures || [];
    const improvementAreas = data.improvementAreas || [];
    const feedbackFeatures = [
      ...goodFeatures.map((feature) => ({
        clinicId,
        featureType: FeedbackFeatureType.GOOD,
        feature,
      })),
      ...badFeatures.map((feature) => ({
        clinicId,
        featureType: FeedbackFeatureType.BAD,
        feature,
      })),
      ...improvementAreas.map((feature) => ({
        clinicId,
        featureType: FeedbackFeatureType.IMPROVEMENT,
        feature,
      })),
    ].filter((entry) => entry.feature.trim().length > 0);

    return this.prisma.feedback.create({
      data: {
        clinicId,
        userId,
        overallRating: data.overallRating,
        goodFeatures,
        goodFeaturesReason: data.goodFeaturesReason,
        badFeatures,
        badFeaturesReason: data.badFeaturesReason,
        improvementAreas,
        improvementReason: data.improvementReason,
        featureRequests: data.featureRequests,
        generalComments: data.generalComments,
        category: (data.category as FeedbackCategory) || 'GENERAL',
        status: 'NEW',
        ...(feedbackFeatures.length > 0
          ? {
              feedbackFeatures: {
                createMany: {
                  data: feedbackFeatures,
                },
              },
            }
          : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        clinic: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async findAllForClinic(clinicId: string) {
    return this.prisma.feedback.findMany({
      where: { clinicId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAll(filters: FeedbackFilters = {}) {
    const where: Prisma.FeedbackWhereInput = {};

    if (filters.status) {
      where.status = filters.status as FeedbackStatus;
    }

    if (filters.category) {
      where.category = filters.category as FeedbackCategory;
    }

    if (filters.clinicId) {
      where.clinicId = filters.clinicId;
    }

    if (filters.minRating || filters.maxRating) {
      where.overallRating = {};
      if (filters.minRating) {
        where.overallRating.gte = filters.minRating;
      }
      if (filters.maxRating) {
        where.overallRating.lte = filters.maxRating;
      }
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.createdAt.lte = new Date(filters.endDate);
      }
    }

    if (filters.search) {
      where.OR = [
        { featureRequests: { contains: filters.search, mode: 'insensitive' } },
        { generalComments: { contains: filters.search, mode: 'insensitive' } },
        {
          goodFeaturesReason: { contains: filters.search, mode: 'insensitive' },
        },
        {
          badFeaturesReason: { contains: filters.search, mode: 'insensitive' },
        },
        {
          improvementReason: { contains: filters.search, mode: 'insensitive' },
        },
      ];
    }

    return this.prisma.feedback.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        clinic: {
          select: {
            id: true,
            name: true,
            tier: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, clinicId?: string) {
    const feedback = await this.prisma.feedback.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        clinic: {
          select: {
            id: true,
            name: true,
            tier: true,
          },
        },
      },
    });

    if (!feedback) {
      throw new NotFoundException('Feedback not found');
    }

    if (clinicId && feedback.clinicId !== clinicId) {
      throw new NotFoundException('Feedback not found');
    }

    return feedback;
  }

  async findByUser(userId: string) {
    return this.prisma.feedback.findMany({
      where: { userId },
      include: {
        clinic: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(
    id: string,
    data: UpdateFeedbackStatusDto,
    clinicId?: string,
  ) {
    const feedback = await this.prisma.feedback.findUnique({
      where: { id },
    });

    if (!feedback) {
      throw new NotFoundException('Feedback not found');
    }

    if (clinicId && feedback.clinicId !== clinicId) {
      throw new ForbiddenException(
        'Cannot update feedback from another clinic',
      );
    }

    return this.prisma.feedback.update({
      where: { id },
      data: {
        status: data.status as FeedbackStatus,
        adminNotes: data.adminNotes,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        clinic: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async getStats(clinicId?: string) {
    const where = clinicId ? { clinicId } : {};

    const [
      total,
      byStatus,
      byCategory,
      avgRating,
      recentFeedback,
      topGoodFeatures,
      topBadFeatures,
      topImprovementAreas,
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
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),

      this.prisma.feedbackFeature.groupBy({
        by: ['feature'],
        where: {
          featureType: FeedbackFeatureType.GOOD,
          ...(clinicId ? { clinicId } : {}),
        },
        _count: { feature: true },
        orderBy: {
          _count: {
            feature: 'desc',
          },
        },
        take: 10,
      }),

      this.prisma.feedbackFeature.groupBy({
        by: ['feature'],
        where: {
          featureType: FeedbackFeatureType.BAD,
          ...(clinicId ? { clinicId } : {}),
        },
        _count: { feature: true },
        orderBy: {
          _count: {
            feature: 'desc',
          },
        },
        take: 10,
      }),

      this.prisma.feedbackFeature.groupBy({
        by: ['feature'],
        where: {
          featureType: FeedbackFeatureType.IMPROVEMENT,
          ...(clinicId ? { clinicId } : {}),
        },
        _count: { feature: true },
        orderBy: {
          _count: {
            feature: 'desc',
          },
        },
        take: 10,
      }),
    ]);

    return {
      total,
      byStatus: byStatus.reduce(
        (acc, item) => {
          acc[item.status] = item._count;
          return acc;
        },
        {} as Record<string, number>,
      ),
      byCategory: byCategory.reduce(
        (acc, item) => {
          acc[item.category] = item._count;
          return acc;
        },
        {} as Record<string, number>,
      ),
      averageRating: avgRating._avg.overallRating || 0,
      recentFeedback,
      topGoodFeatures: topGoodFeatures.map((item) => ({
        feature: item.feature,
        count: item._count.feature,
      })),
      topBadFeatures: topBadFeatures.map((item) => ({
        feature: item.feature,
        count: item._count.feature,
      })),
      topImprovementAreas: topImprovementAreas.map((item) => ({
        feature: item.feature,
        count: item._count.feature,
      })),
    };
  }

  async delete(id: string, clinicId?: string) {
    const feedback = await this.prisma.feedback.findUnique({
      where: { id },
    });

    if (!feedback) {
      throw new NotFoundException('Feedback not found');
    }

    if (clinicId && feedback.clinicId !== clinicId) {
      throw new ForbiddenException(
        'Cannot delete feedback from another clinic',
      );
    }

    return this.prisma.feedback.delete({
      where: { id },
    });
  }

  async hasRecentFeedback(userId: string, clinicId: string): Promise<boolean> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const recent = await this.prisma.feedback.findFirst({
      where: {
        userId,
        clinicId,
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    return !!recent;
  }
}
