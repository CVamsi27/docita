"use client";

import { FC } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Textarea } from "@workspace/ui/components/textarea";
import { Label } from "@workspace/ui/components/label";
import {
  Frown,
  Meh,
  MessageSquare,
  Send,
  Smile,
  Star,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

import { FeedbackType, useFeedbackLogic } from "@/features/feedback/hooks/use-feedback-logic";

export const FeedbackForm: FC<{
  onSubmit?: (feedback: {
    rating: number;
    message: string;
    type: string;
  }) => void;
}> = ({ onSubmit }) => {
  const {
    rating,
    setRating,
    message,
    setMessage,
    type,
    setType,
    handleSubmit,
  } = useFeedbackLogic(onSubmit);

  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <div className="flex items-center gap-3">
          <MessageSquare className="h-5 w-5 text-primary" />
          <div>
            <CardTitle>Send Feedback</CardTitle>
            <CardDescription>We&apos;d love to hear from you</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>How would you rate your experience?</Label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className="p-1 hover:scale-110 transition-transform"
              >
                <Star
                  className={cn(
                    "h-8 w-8 transition-colors",
                    star <= rating
                      ? "fill-yellow-400 text-warning"
                      : "text-muted-foreground",
                  )}
                />
              </button>
            ))}
          </div>
        </div>

        <p className="text-muted-foreground mb-4">
          We&apos;re always looking to improve Docita. Share your thoughts,
          report bugs, or suggest new features.
        </p>

        <div className="space-y-2">
          <Label>Feedback Type</Label>
          <div className="flex gap-2">
            {[
              { id: "bug", label: "Bug Report", icon: Frown },
              { id: "feature", label: "Feature Request", icon: Smile },
              { id: "general", label: "General", icon: Meh },
            ].map((t) => (
              <Button
                key={t.id}
                variant={type === t.id ? "default" : "outline"}
                size="sm"
                onClick={() => setType(t.id as FeedbackType)}
                className="gap-2"
              >
                <t.icon className="h-4 w-4" />
                {t.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Your Message</Label>
          <Textarea
            placeholder="Tell us what you think..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
          />
        </div>

        <Button onClick={handleSubmit} className="w-full gap-2">
          <Send className="h-4 w-4" />
          Submit Feedback
        </Button>
      </CardContent>
    </Card>
  );
};

export const QuickFeedback: FC<{
  onFeedback?: (positive: boolean) => void;
}> = ({ onFeedback }) => {
  return (
    <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
      <span className="text-sm text-muted-foreground">Was this helpful?</span>
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onFeedback?.(true)}
          className="gap-1 hover:text-success hover:bg-success"
        >
          <ThumbsUp className="h-4 w-4" />
          Yes
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onFeedback?.(false)}
          className="gap-1 hover:text-destructive hover:bg-destructive"
        >
          <ThumbsDown className="h-4 w-4" />
          No
        </Button>
      </div>
    </div>
  );
};

export default { FeedbackForm, QuickFeedback };
