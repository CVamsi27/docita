// check-as-cast-density: allow-file — narrowing casts required by generic signatures or external types
import { getUserFacingErrorMessage } from "@workspace/utils";

export const STATUS_OPTIONS = [
  { value: "NEW", label: "New", color: "badge-info" },
  { value: "REVIEWED", label: "Reviewed", color: "badge-warning" },
  { value: "IN_PROGRESS", label: "In Progress", color: "tier-pro" },
  { value: "RESOLVED", label: "Resolved", color: "badge-success" },
  { value: "ARCHIVED", label: "Archived", color: "badge-muted" },
] as const;

export const CATEGORY_OPTIONS = [
  { value: "GENERAL", label: "General" },
  { value: "UI_UX", label: "UI/UX" },
  { value: "PERFORMANCE", label: "Performance" },
  { value: "FEATURES", label: "Features" },
  { value: "BILLING", label: "Billing" },
  { value: "SUPPORT", label: "Support" },
  { value: "OTHER", label: "Other" },
] as const;

export function deriveFeedbackPageStatus(
  feedbacksLoading: boolean,
  statsLoading: boolean,
  feedbacksError: unknown,
  statsError: unknown,
) {
  const loading = feedbacksLoading || statsLoading;
  const queryError = (feedbacksError ?? statsError) as Error | null;
  const errorMessage = queryError
    ? getUserFacingErrorMessage(queryError, {
        context: "load",
        fallback: "We could not load feedback. Please try again.",
      })
    : undefined;
  const pageStatus: "loading" | "error" | "success" =
    loading ? "loading" : queryError ? "error" : "success";
  return { loading, errorMessage, pageStatus };
}
