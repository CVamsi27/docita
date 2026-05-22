import { FeedbackCategory, FeedbackStatus } from '@workspace/db';
import { z } from 'zod';

const feedbackCategorySchema = z.nativeEnum(FeedbackCategory);
const feedbackStatusSchema = z.nativeEnum(FeedbackStatus);

export function parseFeedbackCategory(
  value: string | undefined,
): FeedbackCategory {
  const parsed = feedbackCategorySchema.safeParse(value);
  return parsed.success ? parsed.data : FeedbackCategory.GENERAL;
}

export function parseFeedbackCategoryFilter(
  value: string | undefined,
): FeedbackCategory | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = feedbackCategorySchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

export function parseFeedbackStatusFilter(
  value: string | undefined,
): FeedbackStatus | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = feedbackStatusSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

export function parseFeedbackStatus(value: string): FeedbackStatus {
  const parsed = feedbackStatusSchema.safeParse(value);
  if (!parsed.success) {
    throw parsed.error;
  }
  return parsed.data;
}
