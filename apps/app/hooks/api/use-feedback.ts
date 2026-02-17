import { useAPIMutation, useAPIQuery } from "../../lib/api-core";

export const useFeedbackCanSubmit = () =>
  useAPIQuery<{ canSubmit: boolean }>(
    ["feedback-can-submit"],
    "/feedback/can-submit",
  );

export const useMyFeedback = () =>
  useAPIQuery<
    {
      id: string;
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
      status: string;
      createdAt: string;
      clinic: { id: string; name: string };
    }[]
  >(["my-feedback"], "/feedback/my-feedback");

export const useFeedbackStats = (clinicId?: string) =>
  useAPIQuery<{
    total: number;
    byStatus: Record<string, number>;
    byCategory: Record<string, number>;
    averageRating: number;
    recentFeedback: number;
    topGoodFeatures: { feature: string; count: number }[];
    topBadFeatures: { feature: string; count: number }[];
    topImprovementAreas: { feature: string; count: number }[];
  }>(
    ["feedback-stats", clinicId ?? "all"],
    `/feedback/stats${clinicId ? `?clinicId=${clinicId}` : ""}`,
  );

export const useAllFeedback = (filters?: {
  status?: string;
  category?: string;
  clinicId?: string;
  startDate?: string;
  endDate?: string;
  minRating?: number;
  maxRating?: number;
  search?: string;
}) => {
  const params = new URLSearchParams();
  if (filters?.status) params.append("status", filters.status);
  if (filters?.category) params.append("category", filters.category);
  if (filters?.clinicId) params.append("clinicId", filters.clinicId);
  if (filters?.startDate) params.append("startDate", filters.startDate);
  if (filters?.endDate) params.append("endDate", filters.endDate);
  if (filters?.minRating) params.append("minRating", String(filters.minRating));
  if (filters?.maxRating) params.append("maxRating", String(filters.maxRating));
  if (filters?.search) params.append("search", filters.search);
  const queryString = params.toString();
  return useAPIQuery<
    {
      id: string;
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
      status: string;
      adminNotes?: string;
      createdAt: string;
      user: { id: string; name: string; email: string; role: string };
      clinic: { id: string; name: string; tier: string };
    }[]
  >(
    ["all-feedback", queryString],
    `/feedback/all${queryString ? `?${queryString}` : ""}`,
  );
};

export const useClinicFeedback = () =>
  useAPIQuery<
    {
      id: string;
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
      status: string;
      createdAt: string;
      user: { id: string; name: string; email: string };
    }[]
  >(["clinic-feedback"], "/feedback/clinic");

export const useSubmitFeedback = () =>
  useAPIMutation<
    Record<string, unknown>,
    {
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
  >("/feedback", "POST");

export const useUpdateFeedbackStatus = () =>
  useAPIMutation<Record<string, unknown>, { status: string; adminNotes?: string }>(
    (id) => `/feedback/${id}/status`,
    "PATCH",
  );

export const useDeleteFeedback = (id: string) =>
  useAPIMutation<Record<string, unknown>, void>(`/feedback/${id}`, "DELETE");
