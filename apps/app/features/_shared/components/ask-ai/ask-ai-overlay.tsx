"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { PromptInput } from "@workspace/ui/components/prompt-input";
import { Button } from "@workspace/ui/components/button";
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
 * Origin-style full-screen Ask AI overlay: left history rail, main chat pane,
 * pinned PromptInput, scope chip above the input. The actual AI transport will
 * be wired in a follow-up; for now this captures prompts and renders a local
 * acknowledgement so the surface is reachable, testable, and accessible.
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

  const scopeChip = scope ? (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2 py-0.5">
      <Sparkles aria-hidden className="size-3" />
      <span>{scope.label}</span>
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-muted-foreground">
      <Sparkles aria-hidden className="size-3" />
      <span>Ask anything about your workspace.</span>
    </span>
  );

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? openOverlay() : closeOverlay())}>
      <DialogContent
        className={cn(
          "sm:max-w-[960px] h-[min(720px,90vh)] gap-0 p-0 overflow-hidden",
        )}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Ask AI</DialogTitle>
        </DialogHeader>
        <div className="grid h-full grid-rows-[1fr_auto] md:grid-cols-[220px_1fr]">
          <aside
            aria-label="Ask AI history"
            className="hidden border-r border-border/60 bg-muted/30 p-3 md:block"
          >
            <MicroLabel>Today</MicroLabel>
            <p className="mt-2 text-sm text-muted-foreground">
              No prior threads. Start a new conversation.
            </p>
          </aside>
          <section className="flex h-full min-h-0 flex-col">
            <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
              {messages.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
                  <Sparkles aria-hidden className="size-8 text-primary" />
                  <p className="text-base font-semibold text-foreground">
                    Ask anything about your clinic.
                  </p>
                  <p className="text-sm">
                    Try: &ldquo;Summarize today&rsquo;s queue&rdquo; or &ldquo;Draft a
                    follow-up for Mr. Sharma&rdquo;.
                  </p>
                </div>
              ) : (
                <ol className="flex flex-col gap-3" aria-label="Conversation">
                  {messages.map((message) => (
                    <li
                      key={message.id}
                      className={cn(
                        "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                        message.author === "user"
                          ? "self-end bg-foreground text-background"
                          : "self-start bg-muted text-foreground",
                      )}
                    >
                      {message.content}
                    </li>
                  ))}
                </ol>
              )}
            </div>
            <div className="border-t border-border/60 bg-muted/20 px-4 py-3 sm:px-6">
              <PromptInput
                onSubmitPrompt={handleSubmit}
                submitting={submitting}
                scopeChip={scopeChip}
                placeholder="Ask anything…"
                aria-label="Ask AI prompt"
              />
              <p className="mt-2 text-[var(--fs-2xs)] text-muted-foreground">
                AI suggestions are not medical advice. Confirm with a clinician
                before acting.
              </p>
            </div>
          </section>
        </div>
        <div className="sr-only">
          <Button onClick={closeOverlay}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
