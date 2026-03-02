import { useAPIMutation, useAPIQuery } from "@/lib/api-core";

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
  useAPIMutation<
    Record<string, unknown>,
    { status: string; adminNotes?: string }
  >((id) => `/feedback/${id}/status`, "PATCH");

export const useDeleteFeedback = (id: string) =>
  useAPIMutation<Record<string, unknown>, void>(`/feedback/${id}`, "DELETE");
