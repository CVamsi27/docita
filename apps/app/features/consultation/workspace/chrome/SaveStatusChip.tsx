"use client";

import { useMemo } from "react";
import { Loader2, Check, AlertTriangle, Circle } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { useConsultationDraft } from "@/features/consultation/state/useConsultationDraft";

function humanizeSavedAt(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 5_000) return "just now";
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  return new Date(timestamp).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
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
        return "All changes saved";
    }
  }, [saveState, lastSavedAt]);

  const tone =
    saveState === "error"
      ? "text-destructive border-destructive/30 bg-destructive/5"
      : saveState === "saving"
        ? "text-muted-foreground border-border bg-muted/40"
        : saveState === "dirty"
          ? "text-warning border-warning/30 bg-warning/10"
          : "text-success border-success/30 bg-success/10";

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
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
      ) : saveState === "error" ? (
        <AlertTriangle className="h-3 w-3" aria-hidden="true" />
      ) : saveState === "dirty" ? (
        <Circle className="h-3 w-3" aria-hidden="true" />
      ) : (
        <Check className="h-3 w-3" aria-hidden="true" />
      )}
      <span>{label}</span>
    </div>
  );
}
