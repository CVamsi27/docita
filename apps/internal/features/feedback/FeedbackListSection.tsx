"use client";

// jscpd:ignore-start
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
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
import { Eye, MessageSquare, ThumbsUp, Trash2 } from "lucide-react";
import { formatDate } from "@workspace/utils";
import type { InternalFeedback } from "@workspace/data-access/internal";
import {
  FeedbackRatingStars,
// jscpd:ignore-end
  FeedbackStatusBadge,
} from "./feedback-display";

interface FeedbackListSectionProps {
  feedbacks: InternalFeedback[];
  loading: boolean;
  onView: (feedback: InternalFeedback) => void;
  onDelete: (id: string) => void;
  onSetAdminNotes: (notes: string) => void;
}

export function FeedbackListSection({
  feedbacks,
  loading,
  onView,
  onDelete,
  onSetAdminNotes,
}: FeedbackListSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>All Feedback</CardTitle>
        <CardDescription>{feedbacks.length} feedback entries</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div
            className="flex justify-center py-8"
            role="status"
            aria-live="polite"
            aria-label="Loading feedback"
          >
            <DocitaLoadingIndicator
              variant="section"
              withStatusRole={false}
              iconClassName="h-8 w-8 text-muted-foreground"
            />
          </div>
        ) : feedbacks.length === 0 ? (
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
                    <FeedbackRatingStars rating={feedback.overallRating} />
                    <FeedbackStatusBadge status={feedback.status} />
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
                <div className="flex gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onView(feedback);
                      onSetAdminNotes(feedback.adminNotes || "");
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onDelete(feedback.id)}
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
  );
}
