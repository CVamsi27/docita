"use client";

import { AlertCircle, Sparkles } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";
import { EmptyState } from "@workspace/ui/components/feedback/empty-state";
import type { AskAiStoredMessage } from "./ask-ai-threads";
import { MessageBubble } from "./ask-ai-messages";

interface AskAiMessageListProps {
  messages: AskAiStoredMessage[];
  submitting: boolean;
  streamingText: string | null;
  error: string | null;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}

export function AskAiMessageList({
  messages,
  submitting,
  streamingText,
  error,
  scrollRef,
}: AskAiMessageListProps) {
  return (
    <div
      ref={scrollRef}
      className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6"
    >
      {messages.length === 0 && !streamingText ? (
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
          aria-busy={submitting}
        >
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
          {streamingText ? (
            <li
              className={cn(
                "max-w-[min(100%,28rem)] self-start whitespace-pre-wrap rounded-2xl rounded-bl-md border border-border/60 bg-muted/40 px-3.5 py-2.5 text-[var(--fs-sm)] leading-relaxed text-foreground",
              )}
            >
              {streamingText}
              <span
                className="ml-1 inline-block size-1.5 rounded-full bg-primary align-middle"
                aria-hidden
              />
            </li>
          ) : null}
          {submitting && !streamingText ? (
            <li className="self-start text-[var(--fs-xs)] text-muted-foreground">
              Thinking…
            </li>
          ) : null}
        </ol>
      )}
      {error ? (
        <div
          role="alert"
          className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-[var(--fs-xs)] text-destructive"
        >
          <AlertCircle
            aria-hidden
            className="mt-0.5 size-3.5 shrink-0"
          />
          <span>{error}</span>
        </div>
      ) : null}
    </div>
  );
}
