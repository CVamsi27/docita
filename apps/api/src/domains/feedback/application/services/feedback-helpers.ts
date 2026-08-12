/** Pure helpers for FeedbackService — no DI, no @Injectable. */
import { Prisma, FeedbackCategory, FeedbackStatus } from '@workspace/db';

export interface FeedbackFilters {
  status?: FeedbackStatus;
  category?: FeedbackCategory;
  clinicId?: string;
  startDate?: string;
  endDate?: string;
  minRating?: number;
  maxRating?: number;
  search?: string;
  /** Optional cap on rows returned (applied as Prisma `take`). */
  limit?: number;
}

export function buildFeedbackWhereClause(
  filters: FeedbackFilters,
): Prisma.FeedbackWhereInput {
  const where: Prisma.FeedbackWhereInput = {};

  if (filters.status) where.status = filters.status;
  if (filters.category) where.category = filters.category;
  if (filters.clinicId) where.clinicId = filters.clinicId;

  if (filters.minRating !== undefined || filters.maxRating !== undefined) {
    where.overallRating = {
      ...(filters.minRating !== undefined ? { gte: filters.minRating } : {}),
      ...(filters.maxRating !== undefined ? { lte: filters.maxRating } : {}),
    };
  }

  if (filters.startDate || filters.endDate) {
    where.createdAt = {
      ...(filters.startDate ? { gte: new Date(filters.startDate) } : {}),
      ...(filters.endDate ? { lte: new Date(filters.endDate) } : {}),
    };
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
