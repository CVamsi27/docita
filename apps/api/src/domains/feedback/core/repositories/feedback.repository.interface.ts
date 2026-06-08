// jscpd:ignore-start
import {
  FeedbackCategory,
  FeedbackFeatureType,
  FeedbackStatus,
} from '@workspace/db';
import type { FeedbackFilters } from '@/domains/feedback/application/services/feedback-helpers';

export interface CreateFeedbackData {
  clinicId: string;
  userId: string;
  overallRating: number;
  goodFeatures: string[];
  goodFeaturesReason?: string;
  badFeatures: string[];
  badFeaturesReason?: string;
  improvementAreas: string[];
  improvementReason?: string;
  featureRequests?: string;
  generalComments?: string;
  category: FeedbackCategory;
  // jscpd:ignore-end
  feedbackFeatures: Array<{
    clinicId: string;
    featureType: FeedbackFeatureType;
    feature: string;
  }>;
}

export interface UpdateFeedbackStatusData {
  status: FeedbackStatus;
  adminNotes?: string;
}

export interface FeedbackStatsCounts {
  total: number;
  byStatus: Array<{ status: FeedbackStatus; _count: number }>;
  byCategory: Array<{ category: FeedbackCategory; _count: number }>;
  avgRating: number | null;
  recentCount: number;
  topGood: Array<{ feature: string; count: number }>;
  topBad: Array<{ feature: string; count: number }>;
  topImprovement: Array<{ feature: string; count: number }>;
}

/**
 * Abstracts all Prisma access for the feedback domain. The service stays in
 * `application/services` and orchestrates — it does not touch `@prisma/client`.
 */
export interface IFeedbackRepository {
  create(data: CreateFeedbackData): Promise<unknown>;
  findAllForClinic(clinicId: string): Promise<unknown[]>;
  findAll(filters: FeedbackFilters): Promise<unknown[]>;
  findOneRaw(id: string): Promise<unknown>;
  findByUser(userId: string): Promise<unknown[]>;
  updateStatus(id: string, data: UpdateFeedbackStatusData): Promise<unknown>;
  delete(id: string): Promise<unknown>;
  computeStats(clinicId: string | undefined): Promise<FeedbackStatsCounts>;
  hasFeedbackInWindow(
    userId: string,
    clinicId: string,
    sinceDate: Date,
  ): Promise<boolean>;
}

export const FEEDBACK_REPOSITORY_TOKEN = Symbol('IFeedbackRepository');
