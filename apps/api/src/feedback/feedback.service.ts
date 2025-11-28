import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
}

@Injectable()
export class FeedbackService {
  constructor(private prisma: PrismaService) {}

  /**
   * Submit feedback from a user
   */
  async create(clinicId: string, userId: string, data: CreateFeedbackDto) {
    return this.prisma.feedback.create({
      data: {
        clinicId,
        userId,
        overallRating: data.overallRating,
        goodFeatures: data.goodFeatures || [],
        goodFeaturesReason: data.goodFeaturesReason,
        badFeatures: data.badFeatures || [],
        badFeaturesReason: data.badFeaturesReason,
        improvementAreas: data.improvementAreas || [],
        improvementReason: data.improvementReason,
        featureRequests: data.featureRequests,
        generalComments: data.generalComments,
        category: (data.category as any) || 'GENERAL',
        status: 'NEW',
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

  /**
   * Get all feedback for a clinic (admin view)
   */
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

  /**
   * Get all feedback for super admin (all clinics)
   */
  async findAll(filters: FeedbackFilters = {}) {
    const where: any = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.category) {
      where.category = filters.category;
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

  /**
   * Get feedback by ID
   */
  async findOne(id: string) {
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

    return feedback;
  }

  /**
   * Get user's own feedback history
   */
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

  /**
   * Update feedback status (admin only)
   */
  async updateStatus(id: string, data: UpdateFeedbackStatusDto) {
    const feedback = await this.prisma.feedback.findUnique({
      where: { id },
    });

    if (!feedback) {
      throw new NotFoundException('Feedback not found');
    }

    return this.prisma.feedback.update({
      where: { id },
      data: {
        status: data.status as any,
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

  /**
   * Get feedback statistics for super admin
   */
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
      // Total count
      this.prisma.feedback.count({ where }),

      // Count by status
      this.prisma.feedback.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),

      // Count by category
      this.prisma.feedback.groupBy({
        by: ['category'],
        where,
        _count: true,
      }),

      // Average rating
      this.prisma.feedback.aggregate({
        where,
        _avg: { overallRating: true },
      }),

      // Recent feedback (last 7 days)
      this.prisma.feedback.count({
        where: {
          ...where,
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
      }),

      // Get all good features
      this.prisma.feedback.findMany({
        where,
        select: { goodFeatures: true },
      }),

      // Get all bad features
      this.prisma.feedback.findMany({
        where,
        select: { badFeatures: true },
      }),

      // Get all improvement areas
      this.prisma.feedback.findMany({
        where,
        select: { improvementAreas: true },
      }),
    ]);

    // Aggregate feature mentions
    const goodFeaturesCounts = this.countFeatures(
      topGoodFeatures.flatMap((f) => f.goodFeatures),
    );
    const badFeaturesCounts = this.countFeatures(
      topBadFeatures.flatMap((f) => f.badFeatures),
    );
    const improvementCounts = this.countFeatures(
      topImprovementAreas.flatMap((f) => f.improvementAreas),
    );

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
      topGoodFeatures: goodFeaturesCounts.slice(0, 10),
      topBadFeatures: badFeaturesCounts.slice(0, 10),
      topImprovementAreas: improvementCounts.slice(0, 10),
    };
  }

  /**
   * Count feature mentions and sort by frequency
   */
  private countFeatures(
    features: string[],
  ): { feature: string; count: number }[] {
    const counts: Record<string, number> = {};
    features.forEach((feature) => {
      if (feature) {
        counts[feature] = (counts[feature] || 0) + 1;
      }
    });

    return Object.entries(counts)
      .map(([feature, count]) => ({ feature, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Delete feedback (admin only)
   */
  async delete(id: string) {
    const feedback = await this.prisma.feedback.findUnique({
      where: { id },
    });

    if (!feedback) {
      throw new NotFoundException('Feedback not found');
    }

    return this.prisma.feedback.delete({
      where: { id },
    });
  }

  /**
   * Check if user has submitted feedback recently (within last 30 days)
   */
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
