"use client";

import { useCallback, useRef } from "react";
import type { AskAiScope } from "./ask-ai-context";
import { AskAiError, streamAskAi } from "./ask-ai-stream";
import { deriveTitle, type AskAiStoredMessage, type AskAiStoredThread } from "./ask-ai-threads";

function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useAskAiOverlaySubmit(
  messages: AskAiStoredMessage[],
  submitting: boolean,
  activeThreadId: string | null,
  scope: AskAiScope | null,
  threads: AskAiStoredThread[],
  setMessages: (messages: AskAiStoredMessage[]) => void,
  setActiveThreadId: (id: string | null) => void,
  setStreamingText: (text: string) => void,
  setSubmitting: (submitting: boolean) => void,
  setError: (error: string | null) => void,
  persist: (thread: AskAiStoredThread) => void,
) {
  const abortRef = useRef<AbortController | null>(null);

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
    [activeThreadId, messages, persist, scope, submitting, threads, setMessages, setActiveThreadId, setStreamingText, setSubmitting, setError],
  );

  return { handleSubmit, handleStop, abortRef };
}
