"use client";

// jscpd:ignore-start
import { FC } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Button } from "@workspace/ui/components/form/button";
import { Textarea } from "@workspace/ui/components/form/textarea";
import { Label } from "@workspace/ui/components/form/label";
import {
  Frown,
// jscpd:ignore-end
  Meh,
  MessageSquare,
  Send,
  Smile,
  Star,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { useTranslations } from "next-intl";

import {
  FeedbackType,
  useFeedbackLogic,
} from "@/features/feedback/hooks/use-feedback-logic";

/**
 * Phase 3 (per-feature): apps/app Feedback > Form components
 * (FeedbackForm + QuickFeedback). 6 literals converted to
 * useTranslations("Feedback.form").
 */
function useFeedbackFormTranslations() {
  return useTranslations("Feedback.form");
}

export const FeedbackForm: FC<{
  onSubmit?: (feedback: {
    rating: number;
    message: string;
    type: string;
  }) => void;
}> = ({ onSubmit }) => {
  const t = useFeedbackFormTranslations();
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
            <CardTitle>{t("formTitle")}</CardTitle>
            <CardDescription>{t("formDescription")}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>{t("ratingLabel")}</Label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className="p-1 hover:scale-110 transition-transform"
              >
                <Star
                  className={cn(
                    "h-8 w-8 transition-colors",
                    star <= rating
                      ? "fill-[var(--warning)] text-warning"
                      : "text-muted-foreground",
                  )}
                />
              </button>
            ))}
          </div>
        </div>

        <p className="text-muted-foreground mb-4">
          {t("helperParagraph")}
        </p>

        <div className="space-y-2">
          <Label>{t("feedbackTypeLabel")}</Label>
          <div className="flex gap-2">
            {(
              [
                { id: "bug", label: t("typeBugReport"), icon: Frown },
                { id: "feature", label: t("typeFeatureRequest"), icon: Smile },
                { id: "general", label: t("typeGeneral"), icon: Meh },
              ] as const satisfies ReadonlyArray<{
                id: FeedbackType;
                label: string;
                icon: typeof Frown;
              }>
            ).map((ft) => (
              <Button
                key={ft.id}
                variant={type === ft.id ? "default" : "outline"}
                size="sm"
                onClick={() => setType(ft.id)}
                className="gap-2"
              >
                <ft.icon className="h-4 w-4" />
                {ft.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t("messageLabel")}</Label>
          <Textarea
            placeholder={t("messagePlaceholder")}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
          />
        </div>

        <Button onClick={handleSubmit} className="w-full gap-2">
          <Send className="h-4 w-4" />
          {t("submitButton")}
        </Button>
      </CardContent>
    </Card>
  );
};

export const QuickFeedback: FC<{
  onFeedback?: (positive: boolean) => void;
}> = ({ onFeedback }) => {
  const t = useFeedbackFormTranslations();
  return (
    <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
      <span className="text-sm text-muted-foreground">{t("quickPrompt")}</span>
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onFeedback?.(true)}
          className="gap-1 hover:text-success hover:bg-success"
        >
          <ThumbsUp className="h-4 w-4" />
          {t("yesButton")}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onFeedback?.(false)}
          className="gap-1 hover:text-destructive hover:bg-destructive"
        >
          <ThumbsDown className="h-4 w-4" />
          {t("noButton")}
        </Button>
      </div>
    </div>
  );
};

export default { FeedbackForm, QuickFeedback };
