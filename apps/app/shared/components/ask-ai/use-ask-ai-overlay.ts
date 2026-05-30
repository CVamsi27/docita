"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { useAskAi } from "./ask-ai-context";
import { AskAiError, streamAskAi } from "./ask-ai-stream";
import { resolveAskAiScopeFromPathname } from "./resolve-ask-ai-scope-from-pathname";
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

export function useAskAiOverlay() {
  const { open, scope, closeOverlay, openOverlay } = useAskAi();
  const pathname = usePathname();
  const [threads, setThreads] = useState<AskAiStoredThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AskAiStoredMessage[]>([]);
  const [streamingText, setStreamingText] = useState("");
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
      const target = event.target instanceof HTMLElement ? event.target : null;
      const isEditable =
        !!target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if (isEditable) return;
      event.preventDefault();
      openOverlay(resolveAskAiScopeFromPathname(pathname));
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, openOverlay, closeOverlay, pathname]);

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
        if (!controller.signal.aborted) {
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

  const scopeLabel = scope?.label ?? "Clinic-wide";

  return {
    open,
    openOverlay,
    closeOverlay,
    scopeLabel,
    scrollRef,
    todaysThreads,
    earlierThreads,
    activeThreadId,
    messages,
    streamingText,
    submitting,
    error,
    startNewThread,
    selectThread,
    handleSubmit,
    handleStop,
  };
}
