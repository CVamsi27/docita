"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAskAi } from "./ask-ai-context";
import {
  isToday,
  loadThreads,
  saveThreads,
  upsertThread,
  type AskAiStoredMessage,
  type AskAiStoredThread,
} from "./ask-ai-threads";
import { useAskAiOverlayKeyboard } from "./use-ask-ai-overlay-keyboard";
import { useAskAiOverlaySubmit } from "./use-ask-ai-overlay-submit";

export function useAskAiOverlay() {
  const { open, scope, closeOverlay, openOverlay } = useAskAi();
  const [threads, setThreads] = useState<AskAiStoredThread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AskAiStoredMessage[]>([]);
  const [streamingText, setStreamingText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useAskAiOverlayKeyboard(open, openOverlay, closeOverlay);

  useEffect(() => {
    setThreads(loadThreads());
  }, []);

  useEffect(() => {
    if (!open) return;
    setError(null);
  }, [open]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, streamingText, open]);

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
      setActiveThreadId(threadId);
      setMessages(thread.messages);
      setStreamingText("");
      setError(null);
      setSubmitting(false);
    },
    [threads],
  );

  const { handleSubmit, handleStop } = useAskAiOverlaySubmit(
    messages, submitting, activeThreadId, scope, threads,
    setMessages, setActiveThreadId, setStreamingText, setSubmitting, setError, persist,
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
