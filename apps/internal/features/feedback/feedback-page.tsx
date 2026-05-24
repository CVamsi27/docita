"use client";

import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";

import { useCallback, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Button } from "@workspace/ui/components/form/button";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { EmptyState } from "@workspace/ui/components/feedback/empty-state";
import { AppPageScaffold } from "@workspace/ui/components/layout/app-page-scaffold";
import { PageHeader } from "@workspace/ui/components/layout/page-header";
import { DataState } from "@workspace/ui/components/data-display/data-state";
import { formatDate, getUserFacingErrorMessage } from "@workspace/utils";
import { DatePicker } from "@workspace/ui/components/form/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/overlay/dialog";
import { Textarea } from "@workspace/ui/components/form/textarea";
import { Label } from "@workspace/ui/components/form/label";
import { AlertCircle, CheckCircle, Clock, Eye, Filter, Lightbulb, MessageSquare, RefreshCw, Star, ThumbsDown, ThumbsUp, Trash2 } from "lucide-react";
import { feedbackAPI } from "@/lib/api/api";
import { internalQueryKeys } from "@/lib/api/query-keys";
import {
  type InternalFeedback,
  type InternalFeedbackFilters,
  useInternalFeedbackList,
  useInternalFeedbackStats,
} from "@workspace/data-access/internal";

const STATUS_OPTIONS = [
  { value: "NEW", label: "New", color: "badge-info" },
  { value: "REVIEWED", label: "Reviewed", color: "badge-warning" },
  { value: "IN_PROGRESS", label: "In Progress", color: "tier-pro" },
  { value: "RESOLVED", label: "Resolved", color: "badge-success" },
  { value: "ARCHIVED", label: "Archived", color: "badge-muted" },
];

const CATEGORY_OPTIONS = [
  { value: "GENERAL", label: "General" },
  { value: "UI_UX", label: "UI/UX" },
  { value: "PERFORMANCE", label: "Performance" },
  { value: "FEATURES", label: "Features" },
  { value: "BILLING", label: "Billing" },
  { value: "SUPPORT", label: "Support" },
  { value: "OTHER", label: "Other" },
];

export default function FeedbackPage() {
  const [selectedFeedback, setSelectedFeedback] =
    useState<InternalFeedback | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<InternalFeedbackFilters>({});
  const [adminNotes, setAdminNotes] = useState("");
  const queryClient = useQueryClient();

  const filtersKey = useMemo(() => JSON.stringify(filters), [filters]);
  const feedbacksQuery = useInternalFeedbackList(filtersKey, filters);
  const statsQuery = useInternalFeedbackStats(filters.clinicId);

  const feedbacks = feedbacksQuery.data ?? [];
  const stats = statsQuery.data ?? null;
  const loading = feedbacksQuery.isLoading || statsQuery.isLoading;

  const loadData = useCallback(async () => {
    await Promise.all([feedbacksQuery.refetch(), statsQuery.refetch()]);
  }, [feedbacksQuery, statsQuery]);

  const updateStatusMutation = useMutation({
    mutationFn: (payload: {
      id: string;
      status: string;
      adminNotes?: string;
    }) =>
      feedbackAPI.updateStatus(payload.id, {
        status: payload.status,
        adminNotes: payload.adminNotes,
      }),
    onSuccess: (updated) => {
      setSelectedFeedback(updated);
      setAdminNotes("");
      void Promise.all([
        queryClient.invalidateQueries({
          queryKey: internalQueryKeys.internal.feedback(filtersKey),
        }),
        queryClient.invalidateQueries({
          queryKey: internalQueryKeys.internal.feedbackStats(),
        }),
      ]);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => feedbackAPI.delete(id),
    onSuccess: () => {
      setSelectedFeedback(null);
      void Promise.all([
        queryClient.invalidateQueries({
          queryKey: internalQueryKeys.internal.feedback(filtersKey),
        }),
        queryClient.invalidateQueries({
          queryKey: internalQueryKeys.internal.feedbackStats(),
        }),
      ]);
    },
  });

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await updateStatusMutation.mutateAsync({
        id,
        status,
        adminNotes: adminNotes || undefined,
      });
    } catch (error) {
      void error;
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this feedback?")) return;
    try {
      await deleteMutation.mutateAsync(id);
    } catch (error) {
      void error;
    }
  };

  const getStatusBadge = (status: string) => {
    const option = STATUS_OPTIONS.find((o) => o.value === status);
    return (
      <Badge className={option?.color || "badge-muted"}>
        {option?.label || status}
      </Badge>
    );
  };

  const renderStars = (rating: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${
            rating >= star
              ? "text-warning fill-warning"
              : "text-muted-foreground"
          }`}
        />
      ))}
    </div>
  );

  const pageStatus = loading
    ? "loading"
    : feedbacksQuery.isError || statsQuery.isError
      ? "error"
      : "success";
  const loadError = feedbacksQuery.error ?? statsQuery.error;
  const errorMessage = loadError
    ? getUserFacingErrorMessage(loadError, {
        context: "load",
        fallback: "We could not load feedback. Please try again.",
      })
    : undefined;

  return (
    <AppPageScaffold
      header={
        <PageHeader
          title={
            <span className="flex items-center gap-2">
              <MessageSquare className="h-7 w-7" />
              Feedback Portal
            </span>
          }
          description="View and manage user feedback from all clinics"
          size="compact"
          actions={
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
              <Button variant="outline" onClick={() => void loadData()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          }
        />
      }
    >
      <DataState
        status={pageStatus}
        loadingMessage="Loading feedback…"
        errorMessage={errorMessage}
        onRetry={() => void loadData()}
      >
      {stats && (
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Feedback
              </CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
                {stats.total}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.recentFeedback} in last 7 days
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Average Rating
              </CardTitle>
              <Star className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
                {stats.averageRating.toFixed(1)}
              </div>
              {renderStars(Math.round(stats.averageRating))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">New</CardTitle>
              <AlertCircle className="h-4 w-4 text-info" />
            </CardHeader>
            <CardContent>
              <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)] text-info">
                {stats.byStatus.NEW || 0}
              </div>
              <p className="text-xs text-muted-foreground">Awaiting review</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In progress</CardTitle>
              <Clock className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)] text-primary">
                {stats.byStatus.IN_PROGRESS || 0}
              </div>
              <p className="text-xs text-muted-foreground">Being addressed</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolved</CardTitle>
              <CheckCircle className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)] text-success">
                {stats.byStatus.RESOLVED || 0}
              </div>
              <p className="text-xs text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
        </div>
      )}

      {stats && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-success">
                <ThumbsUp className="h-5 w-5" />
                Top Liked Features
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats.topGoodFeatures.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No data yet</p>
                ) : (
                  stats.topGoodFeatures.slice(0, 5).map((item, idx) => (
                    <div
                      key={item.feature}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm">
                        {idx + 1}. {item.feature}
                      </span>
                      <Badge variant="secondary">{item.count}</Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <ThumbsDown className="h-5 w-5" />
                Features Needing Work
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats.topBadFeatures.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No issues reported
                  </p>
                ) : (
                  stats.topBadFeatures.slice(0, 5).map((item, idx) => (
                    <div
                      key={item.feature}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm">
                        {idx + 1}. {item.feature}
                      </span>
                      <Badge variant="destructive">{item.count}</Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-warning">
                <Lightbulb className="h-5 w-5" />
                Improvement Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {stats.topImprovementAreas.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No suggestions yet
                  </p>
                ) : (
                  stats.topImprovementAreas.slice(0, 5).map((item, idx) => (
                    <div
                      key={item.feature}
                      className="flex items-center justify-between"
                    >
                      <span className="text-sm">
                        {idx + 1}. {item.feature}
                      </span>
                      <Badge variant="outline">{item.count}</Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {showFilters && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-5">
              <div>
                <Label>Status</Label>
                <Select
                  value={filters.status || "all"}
                  onValueChange={(v) =>
                    setFilters({
                      ...filters,
                      status: v === "all" ? undefined : v,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Category</Label>
                <Select
                  value={filters.category || "all"}
                  onValueChange={(v) =>
                    setFilters({
                      ...filters,
                      category: v === "all" ? undefined : v,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {CATEGORY_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Min rating</Label>
                <Select
                  value={String(filters.minRating || "all")}
                  onValueChange={(v) =>
                    setFilters({
                      ...filters,
                      minRating: v === "all" ? undefined : parseInt(v),
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Rating" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any rating</SelectItem>
                    {[1, 2, 3, 4, 5].map((r) => (
                      <SelectItem key={r} value={String(r)}>
                        {r}+ stars
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Start Date</Label>
                <DatePicker
                  value={filters.startDate || undefined}
                  onChange={(date) =>
                    setFilters({
                      ...filters,
                      startDate: date?.toISOString().slice(0, 10) ?? undefined,
                    })
                  }
                  placeholder="Start date"
                />
              </div>
              <div>
                <Label>End Date</Label>
                <DatePicker
                  value={filters.endDate || undefined}
                  onChange={(date) =>
                    setFilters({
                      ...filters,
                      endDate: date?.toISOString().slice(0, 10) ?? undefined,
                    })
                  }
                  placeholder="End date"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button
                variant="outline"
                onClick={() => setFilters({})}
                className="mr-2"
              >
                Clear Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All feedback</CardTitle>
          <CardDescription>{feedbacks.length} feedback entries</CardDescription>
        </CardHeader>
        <CardContent>
          {feedbacks.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="No feedback found"
              description="Feedback entries will appear here once clinics start submitting responses."
            />
          ) : (
            <div className="space-y-4">
              {feedbacks.map((feedback) => (
                <div
                  key={feedback.id}
                  className="flex items-start justify-between p-4 border border-border/70 rounded-[var(--radius)] hover:bg-muted/50 transition-colors"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      {renderStars(feedback.overallRating)}
                      {getStatusBadge(feedback.status)}
                      <Badge variant="outline">{feedback.category}</Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="font-medium">{feedback.user.name}</span>
                      <span className="text-muted-foreground">
                        {feedback.clinic.name}
                      </span>
                      <span className="text-muted-foreground">
                        {formatDate(feedback.createdAt, "MMM d, yyyy")}
                      </span>
                    </div>
                    {feedback.generalComments && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {feedback.generalComments}
                      </p>
                    )}
                    {feedback.goodFeatures.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        <ThumbsUp className="h-4 w-4 text-success" />
                        {feedback.goodFeatures.slice(0, 3).map((f) => (
                          <Badge
                            key={f}
                            variant="secondary"
                            className="text-xs badge-success"
                          >
                            {f}
                          </Badge>
                        ))}
                        {feedback.goodFeatures.length > 3 && (
                          <span className="text-xs text-muted-foreground">
                            +{feedback.goodFeatures.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedFeedback(feedback);
                        setAdminNotes(feedback.adminNotes || "");
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(feedback.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      </DataState>

      <Dialog
        open={!!selectedFeedback}
        onOpenChange={() => setSelectedFeedback(null)}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedFeedback && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  Feedback Details
                  {getStatusBadge(selectedFeedback.status)}
                </DialogTitle>
                <DialogDescription>
                  From {selectedFeedback.user.name} (
                  {selectedFeedback.user.email}) at{" "}
                  {selectedFeedback.clinic.name}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div>
                    <Label className="text-muted-foreground">
                      Overall Rating
                    </Label>
                    <div className="flex items-center gap-2">
                      {renderStars(selectedFeedback.overallRating)}
                      <span className="font-bold">
                        {selectedFeedback.overallRating}/5
                      </span>
                    </div>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Category</Label>
                    <Badge variant="outline">{selectedFeedback.category}</Badge>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Submitted</Label>
                    <p className="text-sm">
                      {formatDate(
                        selectedFeedback.createdAt,
                        "dd MMM yyyy, hh:mm a",
                      )}
                    </p>
                  </div>
                </div>

                {selectedFeedback.goodFeatures.length > 0 && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-success">
                      <ThumbsUp className="h-4 w-4" />
                      Liked Features
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {selectedFeedback.goodFeatures.map((f) => (
                        <Badge key={f} className="badge-success">
                          {f}
                        </Badge>
                      ))}
                    </div>
                    {selectedFeedback.goodFeaturesReason && (
                      <p className="text-sm surface-success p-3 rounded-[var(--radius)]">
                        {selectedFeedback.goodFeaturesReason}
                      </p>
                    )}
                  </div>
                )}

                {selectedFeedback.badFeatures.length > 0 && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-destructive">
                      <ThumbsDown className="h-4 w-4" />
                      Disliked Features
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {selectedFeedback.badFeatures.map((f) => (
                        <Badge key={f} className="badge-danger">
                          {f}
                        </Badge>
                      ))}
                    </div>
                    {selectedFeedback.badFeaturesReason && (
                      <p className="text-sm surface-danger p-3 rounded-[var(--radius)]">
                        {selectedFeedback.badFeaturesReason}
                      </p>
                    )}
                  </div>
                )}

                {selectedFeedback.improvementAreas.length > 0 && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-warning">
                      <Lightbulb className="h-4 w-4" />
                      Areas to Improve
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {selectedFeedback.improvementAreas.map((f) => (
                        <Badge key={f} className="badge-warning">
                          {f}
                        </Badge>
                      ))}
                    </div>
                    {selectedFeedback.improvementReason && (
                      <p className="text-sm surface-warning p-3 rounded-[var(--radius)]">
                        {selectedFeedback.improvementReason}
                      </p>
                    )}
                  </div>
                )}

                {selectedFeedback.featureRequests && (
                  <div className="space-y-2">
                    <Label>Feature requests</Label>
                    <p className="text-sm bg-muted p-3 rounded-[var(--radius)]">
                      {selectedFeedback.featureRequests}
                    </p>
                  </div>
                )}

                {selectedFeedback.generalComments && (
                  <div className="space-y-2">
                    <Label>General comments</Label>
                    <p className="text-sm bg-muted p-3 rounded-[var(--radius)]">
                      {selectedFeedback.generalComments}
                    </p>
                  </div>
                )}

                <div className="border-t pt-4 space-y-4">
                  <div className="space-y-2">
                    <Label>Admin notes</Label>
                    <Textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Feedback notes"
                      className="min-h-20"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Label>Update Status:</Label>
                    {STATUS_OPTIONS.map((opt) => (
                      <Button
                        key={opt.value}
                        variant={
                          selectedFeedback.status === opt.value
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        onClick={() =>
                          handleUpdateStatus(selectedFeedback.id, opt.value)
                        }
                        disabled={updateStatusMutation.isPending}
                      >
                        {updateStatusMutation.isPending ? (
                          <DocitaLoadingIndicator variant="inline" decorative />
                        ) : (
                          opt.label
                        )}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppPageScaffold>
  );
}
