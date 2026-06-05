"use client";

import { useCallback, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { feedbackAPI } from "@/lib/api/api";
import { internalQueryKeys } from "@/lib/api/query-keys";
import { type InternalFeedback, type InternalFeedbackFilters, useInternalFeedbackList, useInternalFeedbackStats } from "@workspace/data-access/internal";
import { deriveFeedbackPageStatus } from "./feedback-helpers";

export function useFeedbackPage() {
  const [selectedFeedback, setSelectedFeedback] = useState<InternalFeedback | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<InternalFeedbackFilters>({});
  const [adminNotes, setAdminNotes] = useState("");
  const queryClient = useQueryClient();
  const filtersKey = useMemo(() => JSON.stringify(filters), [filters]);
  const feedbacksQuery = useInternalFeedbackList(filtersKey, filters);
  const statsQuery = useInternalFeedbackStats(filters.clinicId);
  const feedbacks = feedbacksQuery.data ?? [];
  const stats = statsQuery.data ?? null;
  const loadData = useCallback(
    async () => { await Promise.all([feedbacksQuery.refetch(), statsQuery.refetch()]); },
    [feedbacksQuery, statsQuery],
  );
  const updateStatusMutation = useMutation({
    mutationFn: (p: { id: string; status: string; adminNotes?: string }) =>
      feedbackAPI.updateStatus(p.id, { status: p.status, adminNotes: p.adminNotes }),
    onSuccess: (updated) => {
      setSelectedFeedback(updated);
      setAdminNotes("");
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: internalQueryKeys.internal.feedback(filtersKey) }),
        queryClient.invalidateQueries({ queryKey: internalQueryKeys.internal.feedbackStats() }),
      ]);
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => feedbackAPI.delete(id),
    onSuccess: () => {
      setSelectedFeedback(null);
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: internalQueryKeys.internal.feedback(filtersKey) }),
        queryClient.invalidateQueries({ queryKey: internalQueryKeys.internal.feedbackStats() }),
      ]);
    },
  });
  const handleUpdateStatus = async (id: string, status: string) => {
    try { await updateStatusMutation.mutateAsync({ id, status, adminNotes: adminNotes || undefined }); }
    catch { /* noop */ }
  };
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this feedback?")) return;
    try { await deleteMutation.mutateAsync(id); }
    catch { /* noop */ }
  };
  const { loading, errorMessage, pageStatus } = deriveFeedbackPageStatus(
    feedbacksQuery.isLoading, statsQuery.isLoading,
    feedbacksQuery.error, statsQuery.error,
  );
  return {
    feedbacks, stats, selectedFeedback, showFilters, filters, adminNotes,
    loading, pageStatus, errorMessage, updateStatusMutation, deleteMutation,
    setSelectedFeedback, setShowFilters, setFilters, setAdminNotes,
    handleUpdateStatus, handleDelete, loadData,
  };
}
