"use client";

import { Sparkles } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { Button } from "@workspace/ui/components/button";
import { Kbd } from "@workspace/ui/components/kbd";
import { useAskAi } from "./ask-ai-context";

interface AskAiButtonProps {
  collapsed?: boolean;
  className?: string;
}

/**
 * Pinned bottom sidebar trigger that opens the Ask AI overlay.
 * In collapsed rail mode, renders an icon-only round button.
 */
export function AskAiButton({ collapsed = false, className }: AskAiButtonProps) {
  const { openOverlay } = useAskAi();

  if (collapsed) {
    return (
      <Button
        type="button"
        variant="outline"
        size="icon"
        className={cn("size-9 rounded-full", className)}
        onClick={() => openOverlay()}
        aria-label="Open Ask AI"
        data-testid="ask-ai-trigger"
      >
        <Sparkles className="size-4 text-primary" aria-hidden />
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      className={cn(
        "h-10 w-full justify-start gap-2 rounded-full border-border/70 bg-card text-sm font-medium shadow-sm hover:bg-card/90",
        className,
      )}
      onClick={() => openOverlay()}
      aria-label="Open Ask AI"
      data-testid="ask-ai-trigger"
    >
      <Sparkles className="size-4 text-primary" aria-hidden />
      <span className="flex-1 truncate text-left text-muted-foreground">
        Ask AI
      </span>
      <Kbd className="text-[10px]">⌘J</Kbd>
    </Button>
  );
}
