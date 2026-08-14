import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";

import { useMemo } from "react";
import { Check, AlertTriangle, Circle } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { useConsultationDraft } from "@/features/consultation/state/useConsultationDraft";
import { formatTime } from "@/lib/formatters";

function humanizeSavedAt(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 5_000) return "just now";
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  return formatTime(new Date(timestamp), "HH:mm");
}

interface SaveStatusChipProps {
  className?: string;
}

export function SaveStatusChip({ className }: SaveStatusChipProps) {
  const saveState = useConsultationDraft((s) => s.saveState);
  const lastSavedAt = useConsultationDraft((s) => s.lastSavedAt);

  const label = useMemo(() => {
    switch (saveState) {
      case "saving":
        return "Saving";
      case "saved":
        return lastSavedAt ? `Saved ${humanizeSavedAt(lastSavedAt)}` : "Saved";
      case "error":
        return "Unable to save";
      case "dirty":
        return "Unsaved changes";
      case "idle":
      default:
        return "Synced";
    }
  }, [saveState, lastSavedAt]);

  const tone =
    saveState === "error"
      ? "badge-danger"
      : saveState === "saving"
        ? "badge-muted"
        : saveState === "dirty"
          ? "badge-warning"
          : "badge-success";

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[var(--fs-2xs)] font-medium transition-colors",
        tone,
        className,
      )}
    >
      {saveState === "saving" ? (
        <DocitaLoadingIndicator
          variant="inline"
          decorative
          iconClassName="h-3 w-3"
        />
      ) : saveState === "error" ? (
        <AlertTriangle className="h-3 w-3" aria-hidden="true" />
      ) : saveState === "dirty" ? (
        <Circle className="h-3 w-3" aria-hidden="true" />
      ) : (
        <Check className="h-3 w-3" aria-hidden="true" />
      )}
      <span className="hidden sm:inline">{label}</span>
    </div>
  );
}
