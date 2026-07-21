import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { STATUS_OPTIONS } from "./feedback-helpers";

interface FeedbackStatusBadgeProps {
  status: string;
}

/**
 * Phase 6.6: resolve a status option's label through t(Feedback.status)
 * when a labelKey is present, falling back to the hardcoded English
 * label. Kept as a top-level function so the `as const` tuple narrowing
 * on STATUS_OPTIONS doesn't fight TypeScript inside the JSX expression.
 */
function resolveStatusLabel(
  t: (key: string) => string,
  option: (typeof STATUS_OPTIONS)[number] | undefined,
  fallback: string,
): string {
  if (!option) return fallback;
  // Every entry in STATUS_OPTIONS has a labelKey, so the second branch
  // is the only real path. The fallback is only there as a defence in
  // depth — if the translation key is missing, the literal is what the
  // user sees.
  return t(option.labelKey) || option.label;
}

/** Renders a feedback status as a colour-coded badge using `STATUS_OPTIONS`. */
export function FeedbackStatusBadge({ status }: FeedbackStatusBadgeProps) {
  const t = useTranslations("Feedback.status");
  const option = STATUS_OPTIONS.find((o) => o.value === status);
  // Local string-typed variable gives the JSX expression a single
  // concrete return type. Without it, t(labelKey) widens to
  // RichTranslationValues, which trips the `as const` narrowing.
  const label = resolveStatusLabel(
    (key) => t(key) as string,
    option,
    status,
  );
  return (
    <Badge className={option?.color || "badge-muted"}>
      {label}
    </Badge>
  );
}

interface FeedbackRatingStarsProps {
  rating: number;
}

/** Renders a 1-5 star rating, filling stars up to `rating`. */
export function FeedbackRatingStars({ rating }: FeedbackRatingStarsProps) {
  return (
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
}
