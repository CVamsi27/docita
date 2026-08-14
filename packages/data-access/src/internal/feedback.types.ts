// jscpd:ignore-start
export interface InternalFeedback {
  id: string;
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
  category: string;
// jscpd:ignore-end
  status: string;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
  user: { id: string; name: string; email: string; role: string };
  clinic: { id: string; name: string; tier: string };
}

export interface InternalFeedbackFilters {
  status?: string;
  category?: string;
  clinicId?: string;
  startDate?: string;
  endDate?: string;
  minRating?: number;
  maxRating?: number;
}

export interface InternalFeedbackStats {
  total: number;
  byStatus: Record<string, number>;
  byCategory: Record<string, number>;
  averageRating: number;
  recentFeedback: number;
  topGoodFeatures: { feature: string; count: number }[];
  topBadFeatures: { feature: string; count: number }[];
  topImprovementAreas: { feature: string; count: number }[];
}
