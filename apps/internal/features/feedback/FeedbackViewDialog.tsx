"use client";

import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/overlay/dialog";
import { Button } from "@workspace/ui/components/form/button";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { Label } from "@workspace/ui/components/form/label";
import { Textarea } from "@workspace/ui/components/form/textarea";
import { Lightbulb, ThumbsDown, ThumbsUp } from "lucide-react";
import { formatDate } from "@workspace/utils";
import type { InternalFeedback } from "@workspace/data-access/internal";
import {
  FeedbackRatingStars,
  FeedbackStatusBadge,
} from "./feedback-display";
import { STATUS_OPTIONS } from "./feedback-helpers";

interface FeedbackViewDialogProps {
  feedback: InternalFeedback | null;
  open: boolean;
  adminNotes: string;
  statusUpdating: boolean;
  onOpenChange: (open: boolean) => void;
  onAdminNotesChange: (notes: string) => void;
  onUpdateStatus: (id: string, status: string) => void;
}

export function FeedbackViewDialog({
  feedback,
  open,
  adminNotes,
  statusUpdating,
  onOpenChange,
  onAdminNotesChange,
  onUpdateStatus,
}: FeedbackViewDialogProps) {
  if (!feedback) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Feedback Details
            <FeedbackStatusBadge status={feedback.status} />
          </DialogTitle>
          <DialogDescription>
            From {feedback.user.name} ({feedback.user.email}) at{" "}
            {feedback.clinic.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div>
              <Label className="text-muted-foreground">Overall Rating</Label>
              <div className="flex items-center gap-2">
                <FeedbackRatingStars rating={feedback.overallRating} />
                <span className="font-bold">{feedback.overallRating}/5</span>
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground">Category</Label>
              <Badge variant="outline">{feedback.category}</Badge>
            </div>
            <div>
              <Label className="text-muted-foreground">Submitted</Label>
              <p className="text-sm">
                {formatDate(feedback.createdAt, "dd MMM yyyy, hh:mm a")}
              </p>
            </div>
          </div>

          {feedback.goodFeatures.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-success">
                <ThumbsUp className="h-4 w-4" />
                Liked Features
              </Label>
              <div className="flex flex-wrap gap-2">
                {feedback.goodFeatures.map((f) => (
                  <Badge key={f} className="badge-success">
                    {f}
                  </Badge>
                ))}
              </div>
              {feedback.goodFeaturesReason && (
                <p className="text-sm surface-success p-3 rounded-[var(--radius)]">
                  {feedback.goodFeaturesReason}
                </p>
              )}
            </div>
          )}

          {feedback.badFeatures.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-destructive">
                <ThumbsDown className="h-4 w-4" />
                Disliked Features
              </Label>
              <div className="flex flex-wrap gap-2">
                {feedback.badFeatures.map((f) => (
                  <Badge key={f} className="badge-danger">
                    {f}
                  </Badge>
                ))}
              </div>
              {feedback.badFeaturesReason && (
                <p className="text-sm surface-danger p-3 rounded-[var(--radius)]">
                  {feedback.badFeaturesReason}
                </p>
              )}
            </div>
          )}

          {feedback.improvementAreas.length > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-warning">
                <Lightbulb className="h-4 w-4" />
                Areas to Improve
              </Label>
              <div className="flex flex-wrap gap-2">
                {feedback.improvementAreas.map((f) => (
                  <Badge key={f} className="badge-warning">
                    {f}
                  </Badge>
                ))}
              </div>
              {feedback.improvementReason && (
                <p className="text-sm surface-warning p-3 rounded-[var(--radius)]">
                  {feedback.improvementReason}
                </p>
              )}
            </div>
          )}

          {feedback.featureRequests && (
            <div className="space-y-2">
              <Label>Feature Requests</Label>
              <p className="text-sm bg-muted p-3 rounded-[var(--radius)]">
                {feedback.featureRequests}
              </p>
            </div>
          )}

          {feedback.generalComments && (
            <div className="space-y-2">
              <Label>General Comments</Label>
              <p className="text-sm bg-muted p-3 rounded-[var(--radius)]">
                {feedback.generalComments}
              </p>
            </div>
          )}

          <div className="border-t pt-4 space-y-4">
            <div className="space-y-2">
              <Label>Admin Notes</Label>
              <Textarea
                value={adminNotes}
                onChange={(e) => onAdminNotesChange(e.target.value)}
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
                    feedback.status === opt.value ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => onUpdateStatus(feedback.id, opt.value)}
                  disabled={statusUpdating}
                >
                  {statusUpdating ? (
                    <DocitaLoadingIndicator variant="inline" decorative />
                  ) : (
                    opt.label
                  )}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
