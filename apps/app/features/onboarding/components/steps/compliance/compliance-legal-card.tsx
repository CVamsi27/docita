"use client";

import { Badge, Button } from "@workspace/ui/components";
import { cn } from "@workspace/ui/lib/utils";
import { CheckCircle2, Circle } from "lucide-react";

export function ComplianceLegalCard({
  index,
  title,
  summary,
  accepted,
  error,
  onOpenDocument,
  onUnaccept,
}: {
  index: number;
  title: string;
  summary: string;
  accepted: boolean;
  error?: string;
  onOpenDocument: () => void;
  onUnaccept: () => void;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius)] border p-4 md:p-5 transition-colors duration-150",
        accepted
          ? "border-primary/40 bg-primary/5 shadow-sm"
          : "border-border bg-card hover:border-primary/30 hover:bg-muted/20",
      )}
    >
      <div className="flex items-start gap-3 md:gap-4">
        <div
          className={cn(
            "mt-0.5 shrink-0 rounded-full border p-1.5",
            accepted
              ? "border-primary/40 bg-background/70"
              : "border-muted-foreground/20 bg-background/70",
          )}
        >
          {accepted ? (
            <CheckCircle2 className="h-4 w-4 text-primary" />
          ) : (
            <Circle className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p
              className={cn(
                "text-sm font-semibold",
                accepted && "text-primary",
              )}
            >
              {index}. {title}
            </p>
            <Badge
              variant={accepted ? "default" : "outline"}
              className={cn(
                "text-[var(--fs-2xs)] h-5 px-2",
                accepted
                  ? "bg-primary/90 text-primary-foreground"
                  : "text-muted-foreground",
              )}
            >
              {accepted ? "Accepted" : "Pending review"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
            {summary}
          </p>
          {error ? (
            <p className="text-xs text-destructive mt-2">{error}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              className="h-8 text-xs"
              variant={accepted ? "outline" : "default"}
              onClick={onOpenDocument}
            >
              {accepted ? "Review again" : "Review & accept"}
            </Button>
            {accepted ? (
              <Button
                type="button"
                size="sm"
                className="h-8 text-xs"
                variant="ghost"
                onClick={onUnaccept}
              >
                Mark pending
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
