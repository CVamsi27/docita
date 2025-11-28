"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { Input } from "@workspace/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Textarea } from "@workspace/ui/components/textarea";
import { Label } from "@workspace/ui/components/label";
import {
  MessageSquare,
  Star,
  ThumbsUp,
  ThumbsDown,
  Lightbulb,
  Filter,
  Eye,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import {
  feedbackAPI,
  Feedback,
  FeedbackStats,
  FeedbackFilters,
  API_URL,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { format } from "date-fns";

const STATUS_OPTIONS = [
  { value: "NEW", label: "New", color: "bg-blue-500" },
  { value: "REVIEWED", label: "Reviewed", color: "bg-yellow-500" },
  { value: "IN_PROGRESS", label: "In Progress", color: "bg-purple-500" },
  { value: "RESOLVED", label: "Resolved", color: "bg-green-500" },
  { value: "ARCHIVED", label: "Archived", color: "bg-gray-500" },
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
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(
    null,
  );
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FeedbackFilters>({});
  const [adminNotes, setAdminNotes] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const { token } = useAuth();

  const loadData = useCallback(async () => {
    if (!token) return;

    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const params = new URLSearchParams();
      if (filters.status) params.append("status", filters.status);
      if (filters.category) params.append("category", filters.category);
      if (filters.clinicId) params.append("clinicId", filters.clinicId);
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);
      if (filters.minRating)
        params.append("minRating", String(filters.minRating));
      if (filters.maxRating)
        params.append("maxRating", String(filters.maxRating));
      const queryString = params.toString();

      const [feedbackRes, statsRes] = await Promise.all([
        fetch(
          `${API_URL}/feedback/all${queryString ? `?${queryString}` : ""}`,
          { headers },
        ),
        fetch(`${API_URL}/feedback/stats`, { headers }),
      ]);

      if (feedbackRes.ok) setFeedbacks(await feedbackRes.json());
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (error) {
      console.error("Failed to load feedback:", error);
    } finally {
      setLoading(false);
    }
  }, [token, filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUpdateStatus = async (id: string, status: string) => {
    setUpdatingStatus(true);
    try {
      const updated = await feedbackAPI.updateStatus(id, {
        status,
        adminNotes: adminNotes || undefined,
      });
      setFeedbacks(feedbacks.map((f) => (f.id === id ? updated : f)));
      setSelectedFeedback(updated);
      setAdminNotes("");
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this feedback?")) return;
    try {
      await feedbackAPI.delete(id);
      setFeedbacks(feedbacks.filter((f) => f.id !== id));
      setSelectedFeedback(null);
    } catch (error) {
      console.error("Failed to delete feedback:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    const option = STATUS_OPTIONS.find((o) => o.value === status);
    return (
      <Badge className={`${option?.color || "bg-gray-500"} text-white`}>
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
            rating >= star ? "text-yellow-500 fill-yellow-500" : "text-gray-300"
          }`}
        />
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <MessageSquare className="h-8 w-8" />
            Feedback Portal
          </h1>
          <p className="text-muted-foreground">
            View and manage user feedback from all clinics
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button variant="outline" onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
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
              <div className="text-2xl font-bold">{stats.total}</div>
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
              <Star className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.averageRating.toFixed(1)}
              </div>
              {renderStars(Math.round(stats.averageRating))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">New</CardTitle>
              <AlertCircle className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-500">
                {stats.byStatus.NEW || 0}
              </div>
              <p className="text-xs text-muted-foreground">Awaiting review</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Clock className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-500">
                {stats.byStatus.IN_PROGRESS || 0}
              </div>
              <p className="text-xs text-muted-foreground">Being addressed</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolved</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">
                {stats.byStatus.RESOLVED || 0}
              </div>
              <p className="text-xs text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Feature Insights */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-green-600">
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
              <CardTitle className="flex items-center gap-2 text-red-600">
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
              <CardTitle className="flex items-center gap-2 text-yellow-600">
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

      {/* Filters */}
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
                    <SelectValue placeholder="All statuses" />
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
                    <SelectValue placeholder="All categories" />
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
                <Label>Min Rating</Label>
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
                    <SelectValue placeholder="Any rating" />
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
                <Input
                  type="date"
                  value={filters.startDate || ""}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      startDate: e.target.value || undefined,
                    })
                  }
                />
              </div>
              <div>
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={filters.endDate || ""}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      endDate: e.target.value || undefined,
                    })
                  }
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

      {/* Feedback List */}
      <Card>
        <CardHeader>
          <CardTitle>All Feedback</CardTitle>
          <CardDescription>{feedbacks.length} feedback entries</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : feedbacks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No feedback found
            </div>
          ) : (
            <div className="space-y-4">
              {feedbacks.map((feedback) => (
                <div
                  key={feedback.id}
                  className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
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
                        {format(new Date(feedback.createdAt), "MMM d, yyyy")}
                      </span>
                    </div>
                    {feedback.generalComments && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {feedback.generalComments}
                      </p>
                    )}
                    {feedback.goodFeatures.length > 0 && (
                      <div className="flex gap-1 flex-wrap">
                        <ThumbsUp className="h-4 w-4 text-green-500" />
                        {feedback.goodFeatures.slice(0, 3).map((f) => (
                          <Badge
                            key={f}
                            variant="secondary"
                            className="text-xs bg-green-50 text-green-700"
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

      {/* Feedback Detail Dialog */}
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
                {/* Rating & Category */}
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
                      {format(
                        new Date(selectedFeedback.createdAt),
                        "MMM d, yyyy 'at' h:mm a",
                      )}
                    </p>
                  </div>
                </div>

                {/* Good Features */}
                {selectedFeedback.goodFeatures.length > 0 && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-green-600">
                      <ThumbsUp className="h-4 w-4" />
                      Liked Features
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {selectedFeedback.goodFeatures.map((f) => (
                        <Badge key={f} className="bg-green-100 text-green-700">
                          {f}
                        </Badge>
                      ))}
                    </div>
                    {selectedFeedback.goodFeaturesReason && (
                      <p className="text-sm text-muted-foreground bg-green-50 p-3 rounded-lg">
                        {selectedFeedback.goodFeaturesReason}
                      </p>
                    )}
                  </div>
                )}

                {/* Bad Features */}
                {selectedFeedback.badFeatures.length > 0 && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-red-600">
                      <ThumbsDown className="h-4 w-4" />
                      Disliked Features
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {selectedFeedback.badFeatures.map((f) => (
                        <Badge key={f} className="bg-red-100 text-red-700">
                          {f}
                        </Badge>
                      ))}
                    </div>
                    {selectedFeedback.badFeaturesReason && (
                      <p className="text-sm text-muted-foreground bg-red-50 p-3 rounded-lg">
                        {selectedFeedback.badFeaturesReason}
                      </p>
                    )}
                  </div>
                )}

                {/* Improvement Areas */}
                {selectedFeedback.improvementAreas.length > 0 && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2 text-yellow-600">
                      <Lightbulb className="h-4 w-4" />
                      Areas to Improve
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {selectedFeedback.improvementAreas.map((f) => (
                        <Badge
                          key={f}
                          className="bg-yellow-100 text-yellow-700"
                        >
                          {f}
                        </Badge>
                      ))}
                    </div>
                    {selectedFeedback.improvementReason && (
                      <p className="text-sm text-muted-foreground bg-yellow-50 p-3 rounded-lg">
                        {selectedFeedback.improvementReason}
                      </p>
                    )}
                  </div>
                )}

                {/* Feature Requests */}
                {selectedFeedback.featureRequests && (
                  <div className="space-y-2">
                    <Label>Feature Requests</Label>
                    <p className="text-sm bg-muted p-3 rounded-lg">
                      {selectedFeedback.featureRequests}
                    </p>
                  </div>
                )}

                {/* General Comments */}
                {selectedFeedback.generalComments && (
                  <div className="space-y-2">
                    <Label>General Comments</Label>
                    <p className="text-sm bg-muted p-3 rounded-lg">
                      {selectedFeedback.generalComments}
                    </p>
                  </div>
                )}

                {/* Admin Actions */}
                <div className="border-t pt-4 space-y-4">
                  <div className="space-y-2">
                    <Label>Admin Notes</Label>
                    <Textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Add notes about this feedback..."
                      className="min-h-[80px]"
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
                        disabled={updatingStatus}
                      >
                        {updatingStatus ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
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
    </div>
  );
}
