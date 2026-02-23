import { z } from "zod";

// Enums (Need to be careful if they are not exported from index yet, maybe define here or import)
// Assuming they are likely string unions for now to avoid circular deps or complex imports if not already in index.
// Or I can check if they are in db/enums? No, usually in types/index or similar.
// Let's define them as Zod enums for now based on typical usage or use string if simple.
// Looking at schema: FeedbackCategory, FeedbackStatus.

export const FeedbackCategory = z.enum([
  "GENERAL",
  "BUG",
  "FEATURE_REQUEST",
  "IMPROVEMENT",
  "OTHER",
]);
export const FeedbackStatus = z.enum([
  "NEW",
  "REVIEWED",
  "IN_PROGRESS",
  "RESOLVED",
  "CLOSED",
]);

export const feedbackSchema = z.object({
  id: z.string(),
  clinicId: z.string(),
  userId: z.string(),
  overallRating: z.number().min(1).max(5),
  goodFeatures: z.array(z.string()),
  goodFeaturesReason: z.string().nullable().optional(),
  badFeatures: z.array(z.string()),
  badFeaturesReason: z.string().nullable().optional(),
  improvementAreas: z.array(z.string()),
  improvementReason: z.string().nullable().optional(),
  featureRequests: z.string().nullable().optional(),
  generalComments: z.string().nullable().optional(),
  category: z.string().or(FeedbackCategory), // Accept string for flexibility or enum
  status: z.string().or(FeedbackStatus),
  adminNotes: z.string().nullable().optional(),
  createdAt: z.date().or(z.string()),
  updatedAt: z.date().or(z.string()),

  // Relations
  user: z
    .object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
      role: z.string().optional(),
    })
    .optional(),
  clinic: z
    .object({
      id: z.string(),
      name: z.string(),
      tier: z.string().optional(),
    })
    .optional(),
});

export type Feedback = z.infer<typeof feedbackSchema>;
