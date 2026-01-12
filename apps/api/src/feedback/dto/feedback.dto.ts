import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const CreateFeedbackSchema = z.object({
  overallRating: z.number().int().min(1).max(5),
  goodFeatures: z.array(z.string()).optional(),
  goodFeaturesReason: z.string().optional(),
  badFeatures: z.array(z.string()).optional(),
  badFeaturesReason: z.string().optional(),
  improvementAreas: z.array(z.string()).optional(),
  improvementReason: z.string().optional(),
  featureRequests: z.string().optional(),
  generalComments: z.string().optional(),
  category: z.string().optional(),
});
export class CreateFeedbackDto extends createZodDto(CreateFeedbackSchema) {}

export const UpdateFeedbackStatusSchema = z.object({
  status: z.string(),
  adminNotes: z.string().optional(),
});
export class UpdateFeedbackStatusDto extends createZodDto(
  UpdateFeedbackStatusSchema,
) {}
