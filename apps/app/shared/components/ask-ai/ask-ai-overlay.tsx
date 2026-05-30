"use client";

import { AlertCircle, Plus, Sparkles, Square } from "lucide-react";
import { computeAiCreditBalance } from "@workspace/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/overlay/dialog";
import { EmptyState } from "@workspace/ui/components/feedback/empty-state";
import { PromptInput } from "@workspace/ui/components/form/prompt-input";
import { Button } from "@workspace/ui/components/form/button";
import { cn } from "@workspace/ui/lib/utils";
import { useCurrentUsage } from "@/features/subscription/hooks/use-pricing";
import { formatCountLocale } from "@workspace/utils";
import { MessageBubble, ThreadGroup } from "./ask-ai-messages";
import { useAskAiOverlay } from "./use-ask-ai-overlay";

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

  const scopeChip = (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-[var(--fs-2xs)] font-medium text-muted-foreground">
      <span
        aria-hidden
        className="size-1.5 shrink-0 rounded-full bg-primary"
      />
      <span className="truncate">{overlay.scopeLabel}</span>
    </span>
  );

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
          "sm:h-[min(720px,90dvh)] sm:max-h-[min(720px,90dvh)] sm:max-w-[960px]",
        )}
      >
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
            <div
              ref={overlay.scrollRef}
              className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6"
            >
              {overlay.messages.length === 0 && !overlay.streamingText ? (
                <div className="flex h-full min-h-[16rem] items-center justify-center">
                  <EmptyState
                    icon={Sparkles}
                    title="What should we look at?"
                    description="Summarize today's queue, draft a follow-up, or ask about a schedule block."
                    className="mx-auto max-w-sm"
                  />
                </div>
              ) : (
                <ol
                  className="flex w-full flex-col gap-2.5"
                  aria-label="Conversation"
                  aria-live="polite"
                  aria-busy={overlay.submitting}
                >
                  {overlay.messages.map((message) => (
                    <MessageBubble key={message.id} message={message} />
                  ))}
                  {overlay.streamingText ? (
                    <li
                      className={cn(
                        "max-w-[min(100%,28rem)] self-start whitespace-pre-wrap rounded-2xl rounded-bl-md border border-border/60 bg-muted/40 px-3.5 py-2.5 text-[var(--fs-sm)] leading-relaxed text-foreground",
                      )}
                    >
                      {overlay.streamingText}
                      <span
                        className="ml-1 inline-block size-1.5 rounded-full bg-primary align-middle"
                        aria-hidden
                      />
                    </li>
                  ) : null}
                  {overlay.submitting && !overlay.streamingText ? (
                    <li className="self-start text-[var(--fs-xs)] text-muted-foreground">
                      Thinking…
                    </li>
                  ) : null}
                </ol>
              )}
              {overlay.error ? (
                <div
                  role="alert"
                  className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-[var(--fs-xs)] text-destructive"
                >
                  <AlertCircle aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                  <span>{overlay.error}</span>
                </div>
              ) : null}
            </div>
            <div className="shrink-0 border-t border-border/50 bg-muted/10 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:pb-4 sm:pt-4">
              <div className="flex items-center gap-2">
                <PromptInput
                  className="flex-1"
                  onSubmitPrompt={overlay.handleSubmit}
                  submitting={overlay.submitting}
                  placeholder="Ask anything…"
                  aria-label="Ask AI prompt"
                  autoFocus
                />
                {overlay.submitting ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-9 shrink-0 rounded-full"
                    onClick={overlay.handleStop}
                    aria-label="Stop generating"
                  >
                    <Square className="size-3.5" aria-hidden />
                  </Button>
                ) : null}
              </div>
              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
                <div className="flex min-w-0 items-center gap-2">
                  {scopeChip}
                  {aiCreditBalance.enforced &&
                  aiCreditBalance.remaining !== null ? (
                    <span className="inline-flex max-w-full items-center rounded-full border border-border/60 bg-background px-2.5 py-1 text-[var(--fs-2xs)] font-medium text-muted-foreground">
                      {formatCountLocale(aiCreditBalance.remaining)} AI credits
                      left
                    </span>
                  ) : null}
                  <p className="hidden text-[var(--fs-2xs)] leading-snug text-muted-foreground sm:block">
                    Not medical advice—confirm with a clinician.
                  </p>
                </div>
                <p className="shrink-0 text-[var(--fs-2xs)] text-muted-foreground/80">
                  Enter to send · Shift+Enter for new line
                </p>
              </div>
              <p className="mt-1.5 text-[var(--fs-2xs)] leading-snug text-muted-foreground sm:hidden">
                Not medical advice—confirm with a clinician.
              </p>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
