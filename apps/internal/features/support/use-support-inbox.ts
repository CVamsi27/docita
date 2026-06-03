"use client";

import { getUserFacingErrorMessage } from "@workspace/utils";
import { type FormEvent, useDeferredValue, useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { internalQueryKeys } from "@/lib/api/query-keys";
import { supportAPI } from "@/lib/api/api";
import {
  useInternalSupportWhatsAppThreadMessages,
  useInternalSupportWhatsAppThreads,
} from "@workspace/data-access/internal";
import { filterThreads, MESSAGES_LOAD_ERROR_FALLBACK, THREAD_LIMIT, THREAD_MESSAGES_LIMIT, THREADS_LOAD_ERROR_FALLBACK } from "./support-helpers";

export function useSupportInbox() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedThreadPhoneNumber, setSelectedThreadPhoneNumber] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState("");
  const deferredSearch = useDeferredValue(search);

  const threadsQueryKey = internalQueryKeys.internal.supportWhatsAppThreads(THREAD_LIMIT);
  const selectedThreadKey = selectedThreadPhoneNumber
    ? internalQueryKeys.internal.supportWhatsAppThreadMessages(selectedThreadPhoneNumber, THREAD_MESSAGES_LIMIT)
    : null;

  const threadsQuery = useInternalSupportWhatsAppThreads(THREAD_LIMIT);
  const threadMessagesQuery = useInternalSupportWhatsAppThreadMessages(selectedThreadPhoneNumber, THREAD_MESSAGES_LIMIT);

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: threadsQueryKey }),
      selectedThreadKey ? queryClient.invalidateQueries({ queryKey: selectedThreadKey }) : Promise.resolve(),
    ]);
  };

  const { mutate: markThreadRead } = useMutation({
    mutationFn: (threadPhoneNumber: string) => supportAPI.markWhatsAppThreadRead(threadPhoneNumber),
    onSuccess: invalidate,
  });

  const replyMutation = useMutation({
    mutationFn: ({ threadPhoneNumber, message }: { threadPhoneNumber: string; message: string }) =>
      supportAPI.replyToWhatsAppThread(threadPhoneNumber, { message }),
    onSuccess: async () => {
      setReplyMessage("");
      await invalidate();
    },
  });

  const threads = useMemo(() => threadsQuery.data ?? [], [threadsQuery.data]);

  const filteredThreads = useMemo(
    () => filterThreads(threads, deferredSearch),
    [deferredSearch, threads],
  );

  useEffect(() => {
    if (filteredThreads.length === 0) {
      setSelectedThreadPhoneNumber(null);
      return;
    }
    setSelectedThreadPhoneNumber((current) =>
      current && filteredThreads.some((t) => t.threadPhoneNumber === current)
        ? current
        : filteredThreads[0]?.threadPhoneNumber ?? null,
    );
  }, [filteredThreads]);

  useEffect(() => {
    if (!selectedThreadPhoneNumber) return;
    const thread = threads.find((t) => t.threadPhoneNumber === selectedThreadPhoneNumber);
    if (!thread || thread.unreadCount <= 0) return;
    markThreadRead(selectedThreadPhoneNumber);
  }, [markThreadRead, selectedThreadPhoneNumber, threads]);

  const selectedThread = useMemo(() => {
    if (!filteredThreads.length) return null;
    return filteredThreads.find((t) => t.threadPhoneNumber === selectedThreadPhoneNumber) ?? filteredThreads[0] ?? null;
  }, [filteredThreads, selectedThreadPhoneNumber]);

  const threadMessages = useMemo(() => threadMessagesQuery.data ?? [], [threadMessagesQuery.data]);

  const totalThreads = threads.length;
  const unreadMessages = threads.reduce((total, thread) => total + thread.unreadCount, 0);

  const threadsLoading = threadsQuery.isLoading;
  const threadsErrorMessage = threadsQuery.isError
    ? getUserFacingErrorMessage(threadsQuery.error, { context: "load",     fallback: THREADS_LOAD_ERROR_FALLBACK })
    : null;
  const threadMessagesErrorMessage = threadMessagesQuery.isError
    ? getUserFacingErrorMessage(threadMessagesQuery.error, { context: "load",     fallback: MESSAGES_LOAD_ERROR_FALLBACK })
    : null;

  const handleReply = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedThreadPhoneNumber) return;
    const trimmedMessage = replyMessage.trim();
    if (!trimmedMessage) return;
    await replyMutation.mutateAsync({ threadPhoneNumber: selectedThreadPhoneNumber, message: trimmedMessage });
  };

  return {
    search,
    setSearch,
    selectedThreadPhoneNumber,
    setSelectedThreadPhoneNumber,
    replyMessage,
    setReplyMessage,
    filteredThreads,
    threads,
    selectedThread,
    threadMessages,
    totalThreads,
    unreadMessages,
    threadsQuery,
    threadMessagesQuery,
    threadsLoading,
    threadsErrorMessage,
    threadMessagesErrorMessage,
    replyMutation,
    handleReply,
  };
}
