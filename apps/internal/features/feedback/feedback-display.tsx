import { Star } from "lucide-react";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { STATUS_OPTIONS } from "./feedback-helpers";

interface FeedbackStatusBadgeProps {
  status: string;
}

/** Renders a feedback status as a colour-coded badge using `STATUS_OPTIONS`. */
export function FeedbackStatusBadge({ status }: FeedbackStatusBadgeProps) {
  const option = STATUS_OPTIONS.find((o) => o.value === status);
  return (
    <Badge className={option?.color || "badge-muted"}>
      {option?.label || status}
    </Badge>
  );
}

interface FeedbackRatingStarsProps {
  rating: number;
}

/** Renders a 1-5 star rating, filling stars up to `rating`. */
// jscpd:ignore-start
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
// jscpd:ignore-end
