"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AlertCircle, Plus, Sparkles, Square } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { EmptyState } from "@workspace/ui/components/empty-state";
import { PromptInput } from "@workspace/ui/components/prompt-input";
import { MicroLabel } from "@workspace/ui/components/micro-label";
import { Button } from "@workspace/ui/components/button";
import { cn } from "@workspace/ui/lib/utils";
import { useAskAi } from "./ask-ai-context";
import { AskAiError, streamAskAi } from "./ask-ai-stream";
import {
  deriveTitle,
  isToday,
  loadThreads,
  saveThreads,
  upsertThread,
  type AskAiStoredMessage,
  type AskAiStoredThread,
} from "./ask-ai-threads";

function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

export function AskAiOverlay() {
  const { open, scope, closeOverlay, openOverlay } = useAskAi();
  const [threads, setThreads] = useState<AskAiStoredThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AskAiStoredMessage[]>([]);
  const [streamingText, setStreamingText] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setThreads(loadThreads());
  }, []);

  useEffect(() => {
    if (!open) return;
    setError(null);
  }, [open]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (event: KeyboardEvent) => {
      if (event.key !== "j" || !(event.metaKey || event.ctrlKey)) return;
      if (open) {
        event.preventDefault();
        closeOverlay();
        return;
      }
      const target = event.target as HTMLElement | null;
      const isEditable =
        !!target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if (isEditable) return;
      event.preventDefault();
      openOverlay();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, openOverlay, closeOverlay]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, streamingText, open]);

  useEffect(() => {
    if (!open) {
      abortRef.current?.abort();
      abortRef.current = null;
    }
  }, [open]);

  const todaysThreads = useMemo(
    () => threads.filter((t) => isToday(t.updatedAt)),
    [threads],
  );
  const earlierThreads = useMemo(
    () => threads.filter((t) => !isToday(t.updatedAt)),
    [threads],
  );

  const persist = useCallback((next: AskAiStoredThread) => {
    setThreads((prev) => {
      const merged = upsertThread(prev, next);
      saveThreads(merged);
      return merged;
    });
  }, []);

  const startNewThread = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setActiveThreadId(null);
    setMessages([]);
    setStreamingText("");
    setError(null);
    setSubmitting(false);
  }, []);

  const selectThread = useCallback(
    (threadId: string) => {
      const thread = threads.find((t) => t.id === threadId);
      if (!thread) return;
      abortRef.current?.abort();
      abortRef.current = null;
      setActiveThreadId(threadId);
      setMessages(thread.messages);
      setStreamingText("");
      setError(null);
      setSubmitting(false);
    },
    [threads],
  );

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const handleSubmit = useCallback(
    async (value: string) => {
      if (submitting) return;
      const userMessage: AskAiStoredMessage = {
        id: createId("u"),
        author: "user",
        content: value,
        createdAt: Date.now(),
      };
      const baseMessages = [...messages, userMessage];
      setMessages(baseMessages);
      setStreamingText("");
      setError(null);
      setSubmitting(true);

      const controller = new AbortController();
      abortRef.current = controller;

      const threadId = activeThreadId ?? createId("t");
      const isNewThread = activeThreadId === null;
      if (isNewThread) setActiveThreadId(threadId);

      let assistantText = "";
      try {
        await streamAskAi({
          prompt: value,
          history: messages.map((m) => ({
            role: m.author,
            content: m.content,
          })),
          scope,
          signal: controller.signal,
          onDelta: (delta) => {
            assistantText += delta;
            setStreamingText(assistantText);
          },
        });
      } catch (err) {
        if (controller.signal.aborted) {
          // user-initiated stop — keep partial output if any
        } else {
          const message =
            err instanceof AskAiError
              ? err.message
              : "We couldn't reach the assistant. Please try again.";
          setError(message);
        }
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
      }

      const finalMessages: AskAiStoredMessage[] = assistantText
        ? [
            ...baseMessages,
            {
              id: createId("a"),
              author: "assistant",
              content: assistantText,
              createdAt: Date.now(),
            },
          ]
        : baseMessages;

      setMessages(finalMessages);
      setStreamingText("");
      setSubmitting(false);

      const now = Date.now();
      const existing = threads.find((t) => t.id === threadId);
      persist({
        id: threadId,
        title: existing?.title ?? deriveTitle(value),
        scopeLabel: scope?.label ?? existing?.scopeLabel ?? null,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        messages: finalMessages,
      });
    },
    [activeThreadId, messages, persist, scope, submitting, threads],
  );

  const scopeChipClass =
    "inline-flex max-w-full items-center gap-1.5 rounded-full border border-accent/20 bg-accent/5 px-2.5 py-1 text-[var(--fs-xs)] font-medium text-foreground";

  const scopeChip = (
    <span className={scopeChipClass}>
      <Sparkles aria-hidden className="size-3 shrink-0 text-primary" />
      <span className="truncate">{scope?.label ?? "Clinic-wide"}</span>
    </span>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => (next ? openOverlay() : closeOverlay())}
    >
      <DialogContent
        showCloseButton
        className={cn(
          "gap-0 overflow-hidden p-0 shadow-xl",
          "max-sm:inset-x-0 max-sm:top-0 max-sm:bottom-0 max-sm:h-[100dvh] max-sm:max-h-[100dvh] max-sm:max-w-none max-sm:translate-y-0 max-sm:rounded-none max-sm:border-x-0",
          "sm:h-[min(720px,90dvh)] sm:max-h-[min(720px,90dvh)] sm:max-w-[960px]",
        )}
      >
        <DialogHeader className="flex shrink-0 flex-row items-center gap-2 border-b border-border/50 bg-muted/10 px-4 py-3 sm:px-5">
          <Sparkles aria-hidden className="size-4 shrink-0 text-primary" />
          <DialogTitle className="text-left text-[var(--fs-sm)] font-semibold leading-snug text-foreground">
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
              className="justify-start gap-2"
              onClick={startNewThread}
            >
              <Plus aria-hidden className="size-3.5" />
              New thread
            </Button>
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto pr-1">
              <ThreadGroup
                label="Today"
                threads={todaysThreads}
                activeId={activeThreadId}
                onSelect={selectThread}
                emptyHint="Nothing from today yet."
              />
              {earlierThreads.length > 0 ? (
                <ThreadGroup
                  label="Earlier"
                  threads={earlierThreads}
                  activeId={activeThreadId}
                  onSelect={selectThread}
                />
              ) : null}
            </div>
          </aside>
          <section className="flex min-h-0 flex-1 flex-col bg-background">
            <div
              ref={scrollRef}
              className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-6"
            >
              {messages.length === 0 && !streamingText ? (
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
                  <AlertCircle aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                  <span>{error}</span>
                </div>
              ) : null}
            </div>
            <div className="shrink-0 border-t border-border/50 bg-muted/10 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:pb-4 sm:pt-4">
              <div className="flex items-end gap-2">
                <PromptInput
                  className="flex-1 gap-1.5"
                  onSubmitPrompt={handleSubmit}
                  submitting={submitting}
                  scopeChip={scopeChip}
                  placeholder="Enter your question about patients, visits, or follow-ups"
                  aria-label="Ask AI prompt"
                  autoFocus
                />
                {submitting ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-9 shrink-0 rounded-full"
                    onClick={handleStop}
                    aria-label="Stop generating"
                  >
                    <Square className="size-3.5" aria-hidden />
                  </Button>
                ) : null}
              </div>
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

function MessageBubble({ message }: { message: AskAiStoredMessage }) {
  return (
    <li
      className={cn(
        "max-w-[min(100%,28rem)] whitespace-pre-wrap text-[var(--fs-sm)] leading-relaxed",
        message.author === "user"
          ? "self-end rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-primary-foreground shadow-sm"
          : "self-start rounded-2xl rounded-bl-md border border-border/60 bg-muted/40 px-3.5 py-2.5 text-foreground",
      )}
    >
      {message.content}
    </li>
  );
}

interface ThreadGroupProps {
  label: string;
  threads: AskAiStoredThread[];
  activeId: string | null;
  onSelect: (id: string) => void;
  emptyHint?: string;
}

function ThreadGroup({
  label,
  threads,
  activeId,
  onSelect,
  emptyHint,
}: ThreadGroupProps) {
  return (
    <div className="flex flex-col gap-1">
      <MicroLabel as="h2">{label}</MicroLabel>
      {threads.length === 0 ? (
        emptyHint ? (
          <p className="ui-section-subtitle mt-1 text-pretty text-left leading-snug">
            {emptyHint}
          </p>
        ) : null
      ) : (
        <ul className="flex flex-col gap-0.5">
          {threads.map((thread) => {
            const isActive = thread.id === activeId;
            return (
              <li key={thread.id}>
                <button
                  type="button"
                  onClick={() => onSelect(thread.id)}
                  aria-current={isActive ? "true" : undefined}
                  className={cn(
                    "w-full truncate rounded-md px-2 py-1.5 text-left text-[var(--fs-xs)] leading-snug transition-colors",
                    isActive
                      ? "bg-accent/15 text-foreground"
                      : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                  )}
                  title={thread.title}
                >
                  {thread.title}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
