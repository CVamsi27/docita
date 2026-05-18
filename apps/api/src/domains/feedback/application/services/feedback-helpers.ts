/** Pure helpers for FeedbackService — no DI, no @Injectable. */
import { Prisma, FeedbackCategory, FeedbackStatus } from '@workspace/db';

export interface FeedbackFilters {
  status?: string;
  category?: string;
  clinicId?: string;
  startDate?: string;
  endDate?: string;
  minRating?: number;
  maxRating?: number;
  search?: string;
}

export function buildFeedbackWhereClause(
  filters: FeedbackFilters,
): Prisma.FeedbackWhereInput {
  const where: Prisma.FeedbackWhereInput = {};

  if (filters.status) where.status = filters.status as FeedbackStatus;
  if (filters.category) where.category = filters.category as FeedbackCategory;
  if (filters.clinicId) where.clinicId = filters.clinicId;

  if (filters.minRating || filters.maxRating) {
    where.overallRating = {};
    if (filters.minRating)
      (where.overallRating as Prisma.IntFilter).gte = filters.minRating;
    if (filters.maxRating)
      (where.overallRating as Prisma.IntFilter).lte = filters.maxRating;
  }

  if (filters.startDate || filters.endDate) {
    where.createdAt = {};
    if (filters.startDate)
      (where.createdAt as Prisma.DateTimeFilter).gte = new Date(
        filters.startDate,
      );
    if (filters.endDate)
      (where.createdAt as Prisma.DateTimeFilter).lte = new Date(
        filters.endDate,
      );
  }

  if (filters.search) {
    where.OR = [
      { featureRequests: { contains: filters.search, mode: 'insensitive' } },
      { generalComments: { contains: filters.search, mode: 'insensitive' } },
      { goodFeaturesReason: { contains: filters.search, mode: 'insensitive' } },
      { badFeaturesReason: { contains: filters.search, mode: 'insensitive' } },
      { improvementReason: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  return where;
}
