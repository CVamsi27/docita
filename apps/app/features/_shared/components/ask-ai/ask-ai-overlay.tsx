"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { EmptyState } from "@workspace/ui/components/empty-state";
import { PromptInput } from "@workspace/ui/components/prompt-input";
import { MicroLabel } from "@workspace/ui/components/micro-label";
import { cn } from "@workspace/ui/lib/utils";
import { useAskAi } from "./ask-ai-context";

interface AskAiMessage {
  id: string;
  author: "user" | "assistant";
  content: string;
  createdAt: number;
}

/**
 * Ask AI overlay: history rail (md+), chat pane, pinned PromptInput, scope chip,
 * and compliance footer. AI transport is stubbed with a local acknowledgement.
 */
export function AskAiOverlay() {
  const { open, scope, closeOverlay, openOverlay } = useAskAi();
  const [messages, setMessages] = useState<AskAiMessage[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "j" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        closeOverlay();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, closeOverlay]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "j" && (event.metaKey || event.ctrlKey) && !open) {
        const target = event.target as HTMLElement | null;
        const isEditable =
          !!target &&
          (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.isContentEditable);
        if (!isEditable) {
          event.preventDefault();
          openOverlay();
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, openOverlay]);

  function handleSubmit(value: string) {
    const id = `msg-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      { id, author: "user", content: value, createdAt: Date.now() },
    ]);
    setSubmitting(true);
    queueMicrotask(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: `${id}-ack`,
          author: "assistant",
          content:
            "Got it. I'll work on this and post the answer here. Suggestions are not medical advice.",
          createdAt: Date.now(),
        },
      ]);
      setSubmitting(false);
    });
  }

  const scopeChipClass =
    "inline-flex max-w-full items-center gap-1.5 rounded-full border border-accent/20 bg-accent/5 px-2.5 py-1 text-[var(--fs-xs)] font-medium text-foreground";

  const scopeChip = scope ? (
    <span className={scopeChipClass}>
      <Sparkles aria-hidden className="size-3 shrink-0 text-primary" />
      <span className="truncate">{scope.label}</span>
    </span>
  ) : (
    <span className={scopeChipClass}>
      <Sparkles aria-hidden className="size-3 shrink-0 text-primary" />
      <span>Clinic-wide</span>
    </span>
  );

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? openOverlay() : closeOverlay())}>
      <DialogContent
        showCloseButton
        className={cn(
          "gap-0 overflow-hidden p-0 shadow-xl",
          "max-sm:inset-x-0 max-sm:top-0 max-sm:bottom-0 max-sm:h-[100dvh] max-sm:max-h-[100dvh] max-sm:max-w-none max-sm:translate-y-0 max-sm:rounded-none max-sm:border-x-0",
          "sm:h-[min(720px,90dvh)] sm:max-h-[min(720px,90dvh)] sm:max-w-[960px]",
        )}
      >
        <DialogHeader className="flex shrink-0 flex-row items-center gap-2 border-b border-border/50 bg-muted/10 px-4 py-3 sm:px-5">
          <Sparkles
            aria-hidden
            className="size-4 shrink-0 text-primary"
          />
          <DialogTitle className="text-left text-[var(--fs-sm)] font-semibold leading-snug text-foreground">
            Ask AI
          </DialogTitle>
        </DialogHeader>
        <div className="flex min-h-0 flex-1 flex-col md:grid md:grid-cols-[minmax(12rem,13.5rem)_1fr] md:grid-rows-1">
          <aside
            aria-label="Ask AI conversation history for today"
            className="hidden shrink-0 flex-col gap-1 border-r border-border/50 bg-muted/10 p-4 md:flex"
          >
            <MicroLabel as="h2">Today</MicroLabel>
            <p className="ui-section-subtitle mt-1 text-pretty text-left leading-snug">
              Nothing from today yet. New threads will show here.
            </p>
          </aside>
          <section className="flex min-h-0 flex-1 flex-col bg-background">
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6">
              {messages.length === 0 ? (
                <EmptyState
                  icon={Sparkles}
                  title="What should we look at?"
                  description="Summarize today's queue, draft a follow-up, or ask about a schedule block."
                  className="mx-auto max-w-sm py-4 md:py-8"
                />
              ) : (
                <ol
                  className="flex w-full flex-col gap-2.5"
                  aria-label="Conversation"
                >
                  {messages.map((message) => (
                    <li
                      key={message.id}
                      className={cn(
                        "max-w-[min(100%,28rem)] text-[var(--fs-sm)] leading-relaxed",
                        message.author === "user"
                          ? "self-end rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-primary-foreground shadow-sm"
                          : "self-start rounded-2xl rounded-bl-md border border-border/60 bg-muted/40 px-3.5 py-2.5 text-foreground",
                      )}
                    >
                      {message.content}
                    </li>
                  ))}
                </ol>
              )}
            </div>
            <div className="shrink-0 border-t border-border/50 bg-muted/10 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:pb-4 sm:pt-4">
              <PromptInput
                className="gap-1.5"
                onSubmitPrompt={handleSubmit}
                submitting={submitting}
                scopeChip={scopeChip}
                placeholder="Enter your question about patients, visits, or follow-ups"
                aria-label="Ask AI prompt"
              />
              <div className="mt-3 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                <p className="text-[var(--fs-2xs)] leading-snug text-muted-foreground">
                  Not medical advice—confirm with a clinician before acting.
                </p>
                <p className="shrink-0 text-[var(--fs-2xs)] text-muted-foreground/80">
                  Enter to send · Shift+Enter for new line
                </p>
              </div>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
