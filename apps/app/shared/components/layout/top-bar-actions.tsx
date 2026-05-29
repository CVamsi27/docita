"use client";

import { Button } from "@workspace/ui/components/form/button";
import { Sparkles } from "lucide-react";
import { GlobalSearch } from "@/features/search";
import { QuickAddPopover } from "@/components/navigation/quick-add-popover";
import { useAskAi } from "@/components/ask-ai/ask-ai-context";

export function TopBarActions() {
  const { openOverlay } = useAskAi();

  return (
    <>
      <GlobalSearch />
      <QuickAddPopover />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => openOverlay()}
        aria-label="Open Ask AI"
        data-testid="topbar-ask-ai"
        className="touch-manipulation"
      >
        <Sparkles className="size-4" aria-hidden />
      </Button>
    </>
  );
}

export function openCommandPaletteFromUi() {
  window.dispatchEvent(new Event("docita:open-command-palette"));
}
