"use client";

import { Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@workspace/ui/lib/utils";
import {
  Button,
  Kbd,
  SidebarRailTooltip
} from "@workspace/ui/components";
import { useAskAi } from "./ask-ai-context";
import { resolveAskAiScopeFromPathname } from "./resolve-ask-ai-scope-from-pathname";

interface AskAiButtonProps {
  collapsed?: boolean;
  className?: string;
}

/**
 * Pinned bottom sidebar trigger that opens the Ask AI overlay.
 * In collapsed rail mode, renders an icon-only round button.
 */
export function AskAiButton({
  collapsed = false,
  className,
}: AskAiButtonProps) {
  const { openOverlay } = useAskAi();
  const pathname = usePathname();
  const openWithRouteScope = () =>
    openOverlay(resolveAskAiScopeFromPathname(pathname));

  if (collapsed) {
    return (
      <SidebarRailTooltip label="Ask AI">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className={cn("size-9 rounded-full", className)}
          onClick={openWithRouteScope}
          aria-label="Open Ask AI"
          data-testid="ask-ai-trigger"
        >
          <Sparkles className="size-4 text-primary" aria-hidden />
        </Button>
      </SidebarRailTooltip>
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
      onClick={openWithRouteScope}
      aria-label="Open Ask AI"
      data-testid="ask-ai-trigger"
    >
      <Sparkles className="size-4 text-primary" aria-hidden />
      <span className="flex-1 truncate text-left text-muted-foreground">
        Ask AI
      </span>
      <Kbd className="text-[0.625rem]">⌘J</Kbd>
    </Button>
  );
}
