"use client";

import { Sparkles } from "lucide-react";
import { DialogHeader, DialogTitle } from "@workspace/ui/components/overlay/dialog";

export function AskAiHeader() {
  return (
    <DialogHeader className="flex shrink-0 flex-row items-center gap-2.5 border-b border-border/50 bg-muted/10 px-5 py-3.5 sm:px-6">
      <span
        aria-hidden
        className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
      >
        <Sparkles className="size-4" />
      </span>
      <DialogTitle className="text-left text-[var(--fs-base)] font-semibold leading-tight text-foreground">
        Ask AI
      </DialogTitle>
    </DialogHeader>
  );
}
