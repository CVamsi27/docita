"use client";

import {
  Button,
  SymbolTooltip
} from "@workspace/ui/components";
import { CategoryAvatar } from "@workspace/ui/components/indicators/category-avatar";
import { Activity, Trash2 } from "lucide-react";

interface ComplaintHeaderProps {
  index: number;
  isPrimary: boolean;
  hasComplaint: boolean;
  readOnly: boolean;
  onRemove: () => void;
}

export function ComplaintHeader({
  index,
  isPrimary,
  hasComplaint,
  readOnly,
  onRemove,
}: ComplaintHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          <CategoryAvatar
            icon={<Activity />}
            tone="primary"
            size="sm"
            aria-label="Complaint"
          />
          <span className="text-sm font-semibold">
            {isPrimary
              ? "Primary complaint"
              : `Additional complaint ${index}`}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {isPrimary
            ? "What is the main reason for this consultation?"
            : "Add another symptom or concern if it is clinically relevant"}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            hasComplaint ? "badge-success" : "badge-warning"
          }`}
        >
          {hasComplaint ? "Recorded" : "Needs symptom"}
        </span>
        {!readOnly ? (
          <SymbolTooltip
            label={
              isPrimary
                ? "Remove primary complaint"
                : "Remove additional complaint"
            }
          >
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              onClick={onRemove}
              aria-label="Remove complaint"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </SymbolTooltip>
        ) : null}
      </div>
    </div>
  );
}
