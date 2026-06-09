"use client";

import { Plus } from "lucide-react";
import { computeAiCreditBalance } from "@workspace/types";
import {
  Dialog,
  DialogContent,
} from "@workspace/ui/components/overlay/dialog";
import { Button } from "@workspace/ui/components/form/button";
import { cn } from "@workspace/ui/lib/utils";
import { useCurrentUsage } from "@/features/subscription/hooks/use-pricing";
import { ThreadGroup } from "./ask-ai-messages";
import { useAskAiOverlay } from "./use-ask-ai-overlay";
import { AskAiHeader } from "./AskAiHeader";
import { AskAiMessageList } from "./AskAiMessageList";
import { AskAiInput } from "./AskAiInput";

export function AskAiOverlay() {
  const overlay = useAskAiOverlay();
  const { usage } = useCurrentUsage();
  const aiCreditAllotment =
    usage && usage.meters.aiCredits.included > 0
      ? usage.meters.aiCredits.included
      : null;
  const aiCreditBalance = computeAiCreditBalance(
    aiCreditAllotment,
    usage?.meters.aiCredits.current ?? 0,
  );

  const hasAnyThreads =
    overlay.todaysThreads.length > 0 || overlay.earlierThreads.length > 0;

  return (
    <Dialog
      open={overlay.open}
      onOpenChange={(next) =>
        next ? overlay.openOverlay() : overlay.closeOverlay()
      }
    >
      <DialogContent
        showCloseButton
        className={cn(
          "gap-0 overflow-hidden p-0 shadow-xl",
          "max-sm:inset-x-0 max-sm:top-0 max-sm:bottom-0 max-sm:h-[100dvh] max-sm:max-h-[100dvh] max-sm:max-w-none max-sm:translate-y-0 max-sm:rounded-none max-sm:border-x-0",
          "sm:h-[min(720px,90dvh)] sm:max-h-[min(720px,90dvh)] sm:w-[calc(100vw-2rem)] sm:max-w-[640px]",
          "md:max-w-[900px]",
        )}
      >
        <AskAiHeader />
        <div className="flex min-h-0 flex-1 flex-col md:grid md:grid-cols-[minmax(12rem,13.5rem)_1fr] md:grid-rows-1">
          <aside
            aria-label="Ask AI conversation history"
            className="hidden shrink-0 flex-col gap-3 border-r border-border/50 bg-muted/10 p-3 md:flex"
          >
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full justify-center gap-2"
              onClick={overlay.startNewThread}
            >
              <Plus aria-hidden className="size-3.5" />
              New thread
            </Button>
            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1">
              {overlay.todaysThreads.length > 0 ? (
                <ThreadGroup
                  label="Today"
                  threads={overlay.todaysThreads}
                  activeId={overlay.activeThreadId}
                  onSelect={overlay.selectThread}
                />
              ) : null}
              {overlay.earlierThreads.length > 0 ? (
                <ThreadGroup
                  label="Earlier"
                  threads={overlay.earlierThreads}
                  activeId={overlay.activeThreadId}
                  onSelect={overlay.selectThread}
                />
              ) : null}
              {!hasAnyThreads ? (
                <p className="px-2 text-[var(--fs-xs)] leading-snug text-muted-foreground">
                  Your conversations will appear here.
                </p>
              ) : null}
            </div>
          </aside>
          <section className="flex min-h-0 flex-1 flex-col bg-background">
            <AskAiMessageList
              messages={overlay.messages}
              submitting={overlay.submitting}
              streamingText={overlay.streamingText}
              error={overlay.error}
              scrollRef={overlay.scrollRef}
            />
            <AskAiInput
              submitting={overlay.submitting}
              scopeLabel={overlay.scopeLabel}
              aiCreditBalance={aiCreditBalance}
              onSend={overlay.handleSubmit}
              onStop={overlay.handleStop}
            />
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
