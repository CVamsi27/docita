import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import {
  FeedbackCategory,
  FeedbackFeatureType,
  FeedbackStatus,
} from '@workspace/db';
import { type FeedbackFilters } from './feedback-helpers';
import {
  FEEDBACK_REPOSITORY_TOKEN,
  IFeedbackRepository,
} from '@/domains/feedback/core/repositories/feedback.repository.interface';
import {
  CLOCK_PORT,
  type IClock,
} from '@/shared/common/ports/clock.port';

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

interface FeedbackWithClinic {
  clinicId: string | null;
}

/**
 * Thin facade — delegates feedback persistence to IFeedbackRepository.
 */
@Injectable()
export class FeedbackService {
  constructor(
    @Inject(FEEDBACK_REPOSITORY_TOKEN)
    private readonly repository: IFeedbackRepository,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

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

    return this.repository.create({
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
      feedbackFeatures,
    });
  }

  findAllForClinic(clinicId: string) {
    return this.repository.findAllForClinic(clinicId);
  }

  findAll(filters: FeedbackFilters = {}) {
    return this.repository.findAll(filters);
  }

  async findOne(id: string, clinicId?: string) {
    const feedback = (await this.repository.findOneRaw(
      id,
    )) as FeedbackWithClinic | null;
    if (!feedback) {
      throw new NotFoundException('Feedback not found');
    }
    if (clinicId && feedback.clinicId !== clinicId) {
      throw new NotFoundException('Feedback not found');
    }
    return feedback;
  }

  findByUser(userId: string) {
    return this.repository.findByUser(userId);
  }

  async updateStatus(
    id: string,
    data: UpdateFeedbackStatusDto,
    clinicId?: string,
  ) {
    const feedback = (await this.repository.findOneRaw(
      id,
    )) as FeedbackWithClinic | null;
    if (!feedback) {
      throw new NotFoundException('Feedback not found');
    }
    if (clinicId && feedback.clinicId !== clinicId) {
      throw new ForbiddenException(
        'Cannot update feedback from another clinic',
      );
    }

    return this.repository.updateStatus(id, {
      status: data.status as FeedbackStatus,
      adminNotes: data.adminNotes,
    });
  }

  async getStats(clinicId?: string) {
    const stats = await this.repository.computeStats(clinicId);

    const byStatus = stats.byStatus.reduce(
      (acc, item) => {
        acc[item.status] = item._count;
        return acc;
      },
      {} as Record<string, number>,
    );
    const byCategory = stats.byCategory.reduce(
      (acc, item) => {
        acc[item.category] = item._count;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      total: stats.total,
      byStatus,
      byCategory,
      averageRating: stats.avgRating ?? 0,
      recentFeedback: stats.recentCount,
      topGoodFeatures: stats.topGood,
      topBadFeatures: stats.topBad,
      topImprovementAreas: stats.topImprovement,
    };
  }

  async delete(id: string, clinicId?: string) {
    const feedback = (await this.repository.findOneRaw(
      id,
    )) as FeedbackWithClinic | null;
    if (!feedback) {
      throw new NotFoundException('Feedback not found');
    }
    if (clinicId && feedback.clinicId !== clinicId) {
      throw new ForbiddenException(
        'Cannot delete feedback from another clinic',
      );
    }
    return this.repository.delete(id);
  }

  hasRecentFeedback(userId: string, clinicId: string): Promise<boolean> {
    const now = this.clock.now();
    const thirtyDaysAgo = new Date(
      now.getTime() - 30 * 24 * 60 * 60 * 1000,
    );
    return this.repository.hasFeedbackInWindow(userId, clinicId, thirtyDaysAgo);
  }
}
