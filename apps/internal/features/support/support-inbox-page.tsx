"use client";

import { type FormEvent, useDeferredValue, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Textarea } from "@workspace/ui/components/textarea";
import {
  getUserFacingErrorMessage,
  SupportWhatsAppMessage,
} from "@workspace/types";
import { internalQueryKeys } from "@/lib/query-keys";
import { supportAPI } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import {
  Inbox,
  Loader2,
  MessageSquare,
  Phone,
  Search,
  Send,
} from "lucide-react";

const THREAD_LIMIT = 100;
const THREAD_MESSAGES_LIMIT = 500;

function getThreadLabel(thread: {
  senderName?: string | null;
  threadPhoneNumber: string;
}) {
  return thread.senderName?.trim() || thread.threadPhoneNumber;
}

function getWhatsAppLink(phoneNumber: string) {
  const digits = phoneNumber.replace(/\D/g, "");
  return digits ? `https://wa.me/${digits}` : "#";
}

function formatMessageType(messageType: string) {
  if (!messageType) return "Message";

  return messageType
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatStatusBadgeVariant(status: string) {
  if (status === "PENDING") return "secondary";
  if (status === "NEW") return "default";
  if (status === "FAILED") return "destructive";
  return "secondary";
}

function getMessageAuthor(
  message: Pick<
    SupportWhatsAppMessage,
    "direction" | "senderName" | "senderPhoneNumber"
  >,
) {
  if (message.direction === "OUTBOUND") {
    return "You";
  }

  return message.senderName?.trim() || message.senderPhoneNumber;
}

export function SupportInboxPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedThreadPhoneNumber, setSelectedThreadPhoneNumber] = useState<
    string | null
  >(null);
  const [replyMessage, setReplyMessage] = useState("");
  const deferredSearch = useDeferredValue(search);

  const threadsQueryKey = internalQueryKeys.internal.supportWhatsAppThreads(
    THREAD_LIMIT,
  );
  const selectedThreadKey = selectedThreadPhoneNumber
    ? internalQueryKeys.internal.supportWhatsAppThreadMessages(
        selectedThreadPhoneNumber,
        THREAD_MESSAGES_LIMIT,
      )
    : null;

  const threadsQuery = useQuery({
    queryKey: threadsQueryKey,
    queryFn: () => supportAPI.getWhatsAppThreads(THREAD_LIMIT),
    enabled: Boolean(token),
  });

  const threadMessagesQuery = useQuery({
    queryKey: selectedThreadKey ?? ["internal", "support", "whatsapp", "thread", ""],
    queryFn: () =>
      supportAPI.getWhatsAppThreadMessages(
        selectedThreadPhoneNumber ?? "",
        THREAD_MESSAGES_LIMIT,
      ),
    enabled: Boolean(token && selectedThreadPhoneNumber),
  });

  const { mutate: markThreadRead } = useMutation({
    mutationFn: (threadPhoneNumber: string) =>
      supportAPI.markWhatsAppThreadRead(threadPhoneNumber),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: threadsQueryKey }),
        selectedThreadKey
          ? queryClient.invalidateQueries({ queryKey: selectedThreadKey })
          : Promise.resolve(),
      ]);
    },
  });

  const replyMutation = useMutation({
    mutationFn: ({
      threadPhoneNumber,
      message,
    }: {
      threadPhoneNumber: string;
      message: string;
    }) => supportAPI.replyToWhatsAppThread(threadPhoneNumber, { message }),
    onSuccess: async () => {
      setReplyMessage("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: threadsQueryKey }),
        selectedThreadKey
          ? queryClient.invalidateQueries({ queryKey: selectedThreadKey })
          : Promise.resolve(),
      ]);
    },
  });

  const threads = useMemo(
    () => threadsQuery.data ?? [],
    [threadsQuery.data],
  );

  const filteredThreads = useMemo(() => {
    const normalized = deferredSearch.trim().toLowerCase();
    if (!normalized) return threads;

    return threads.filter((thread) => {
      return [
        thread.senderName,
        thread.threadPhoneNumber,
        thread.supportPhoneNumber,
        thread.lastMessageBody,
        thread.lastMessageType,
        thread.lastMessageStatus,
        thread.lastMessageDirection,
      ]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalized));
    });
  }, [deferredSearch, threads]);

  useEffect(() => {
    if (filteredThreads.length === 0) {
      setSelectedThreadPhoneNumber(null);
      return;
    }

    setSelectedThreadPhoneNumber((current) =>
      current &&
      filteredThreads.some((thread) => thread.threadPhoneNumber === current)
        ? current
        : filteredThreads[0]?.threadPhoneNumber ?? null,
    );
  }, [filteredThreads]);

  useEffect(() => {
    if (!selectedThreadPhoneNumber) {
      return;
    }

    markThreadRead(selectedThreadPhoneNumber);
  }, [markThreadRead, selectedThreadPhoneNumber]);

  const selectedThread = useMemo(() => {
    if (!filteredThreads.length) {
      return null;
    }

    return (
      filteredThreads.find(
        (thread) => thread.threadPhoneNumber === selectedThreadPhoneNumber,
      ) ?? filteredThreads[0] ?? null
    );
  }, [filteredThreads, selectedThreadPhoneNumber]);

  const threadMessages = useMemo(
    () => threadMessagesQuery.data ?? [],
    [threadMessagesQuery.data],
  );

  const totalThreads = threads.length;
  const unreadMessages = threads.reduce(
    (total, thread) => total + thread.unreadCount,
    0,
  );

  const threadsLoading = threadsQuery.isLoading;
  const threadsErrorMessage = threadsQuery.isError
    ? getUserFacingErrorMessage(threadsQuery.error, {
        context: "load",
        fallback: "We could not load WhatsApp messages right now. Please try again.",
      })
    : null;

  const threadMessagesErrorMessage = threadMessagesQuery.isError
    ? getUserFacingErrorMessage(threadMessagesQuery.error, {
        context: "load",
        fallback: "We could not load this conversation right now. Please try again.",
      })
    : null;

  const handleReply = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedThreadPhoneNumber) {
      return;
    }

    const trimmedMessage = replyMessage.trim();
    if (!trimmedMessage) {
      return;
    }

    await replyMutation.mutateAsync({
      threadPhoneNumber: selectedThreadPhoneNumber,
      message: trimmedMessage,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
            <Inbox className="h-3.5 w-3.5" />
            WhatsApp Inbox
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-normal sm:text-3xl">
              Incoming Messages
            </h1>
            <p className="text-sm text-muted-foreground">
              Live WhatsApp conversations received on the onboarding support
              line, with replies sent directly from the internal portal.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:min-w-[260px]">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Threads
              </p>
              <p className="text-2xl font-bold">{totalThreads}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Unread
              </p>
              <p className="text-2xl font-bold">{unreadMessages}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {threadsLoading && (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Loading WhatsApp conversations...
          </CardContent>
        </Card>
      )}

      {threadsErrorMessage && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-6 text-sm text-destructive">
            {threadsErrorMessage}
          </CardContent>
        </Card>
      )}

      {!threadsLoading && !threadsErrorMessage && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <Card className="min-w-0">
            <CardHeader className="space-y-4 border-b bg-muted/20">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle className="text-lg">Threads</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Select a conversation to review the full WhatsApp history.
                  </p>
                </div>
                <div className="flex flex-col gap-2 text-right">
                  <Badge variant="secondary" className="w-fit self-end">
                    {totalThreads} total
                  </Badge>
                  <Badge variant="default" className="w-fit self-end">
                    {unreadMessages} unread
                  </Badge>
                </div>
              </div>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by name, phone, or message"
                  className="pl-10"
                />
              </div>
            </CardHeader>

            <CardContent className="space-y-3 p-4 sm:p-5">
              {filteredThreads.length === 0 ? (
                <div className="rounded-lg border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                  {search.trim()
                    ? "No WhatsApp conversations matched your search"
                    : "No incoming WhatsApp messages yet"}
                </div>
              ) : (
                filteredThreads.map((thread) => {
                  const isSelected =
                    thread.threadPhoneNumber === selectedThread?.threadPhoneNumber;

                  return (
                    <button
                      key={thread.threadPhoneNumber}
                      type="button"
                      onClick={() =>
                        setSelectedThreadPhoneNumber(thread.threadPhoneNumber)
                      }
                      className={[
                        "w-full rounded-lg border p-4 text-left transition-colors",
                        "hover:border-primary/40 hover:bg-muted/30",
                        isSelected
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border bg-background",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-sm font-semibold">
                              {getThreadLabel(thread)}
                            </p>
                            {thread.unreadCount > 0 && (
                              <Badge variant="default">{thread.unreadCount} new</Badge>
                            )}
                          </div>
                          <p className="truncate text-xs text-muted-foreground">
                            {thread.threadPhoneNumber}
                          </p>
                          <p className="line-clamp-2 text-sm text-muted-foreground">
                            {thread.lastMessageBody}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatMessageType(thread.lastMessageType)} on{" "}
                            {thread.lastMessageDirection.toLowerCase()}
                          </p>
                        </div>
                        <div className="shrink-0 text-right text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(thread.lastMessageAt), {
                            addSuffix: true,
                          })}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card className="min-w-0">
            {selectedThread ? (
              <>
                <CardHeader className="space-y-4 border-b bg-muted/20">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-lg">
                          {getThreadLabel(selectedThread)}
                        </CardTitle>
                        {selectedThread.unreadCount > 0 && (
                          <Badge variant="default">
                            {selectedThread.unreadCount} unread
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                        <a
                          href={getWhatsAppLink(selectedThread.threadPhoneNumber)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 hover:text-foreground"
                        >
                          <MessageSquare className="h-4 w-4" />
                          Open WhatsApp
                        </a>
                        <p className="inline-flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          {selectedThread.threadPhoneNumber}
                        </p>
                        <p>Support line: {selectedThread.supportPhoneNumber}</p>
                        <p>
                          Last activity{" "}
                          {formatDistanceToNow(new Date(selectedThread.lastMessageAt), {
                            addSuffix: true,
                          })}
                          {" "}
                          ({format(new Date(selectedThread.lastMessageAt), "PPpp")})
                        </p>
                      </div>
                    </div>

                    <Button asChild variant="outline" size="sm">
                      <a
                        href={getWhatsAppLink(selectedThread.threadPhoneNumber)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open chat
                      </a>
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 p-5">
                  <div className="space-y-3">
                    {threadMessagesQuery.isLoading && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Loading conversation...
                      </div>
                    )}

                    {threadMessagesErrorMessage && (
                      <Card className="border-destructive/30 bg-destructive/5">
                        <CardContent className="p-4 text-sm text-destructive">
                          {threadMessagesErrorMessage}
                        </CardContent>
                      </Card>
                    )}

                    {!threadMessagesQuery.isLoading && !threadMessagesErrorMessage && (
                      <div className="space-y-3">
                        {threadMessages.length === 0 ? (
                          <div className="rounded-lg border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                            This conversation has no stored messages yet.
                          </div>
                        ) : (
                          threadMessages.map((message) => {
                            const isOutbound = message.direction === "OUTBOUND";

                            return (
                              <div
                                key={message.id}
                                className={`flex ${
                                  isOutbound ? "justify-end" : "justify-start"
                                }`}
                              >
                                <div
                                  className={[
                                    "max-w-[90%] rounded-lg border p-4 shadow-sm",
                                    isOutbound
                                      ? "border-primary/20 bg-primary/5"
                                      : "border-border bg-muted/30",
                                  ].join(" ")}
                                >
                                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                    <span className="font-medium text-foreground">
                                      {getMessageAuthor(message)}
                                    </span>
                                    <Badge
                                      variant={
                                        message.status === "NEW"
                                          ? "default"
                                          : formatStatusBadgeVariant(message.status)
                                      }
                                    >
                                      {message.status}
                                    </Badge>
                                    <span>{formatMessageType(message.messageType)}</span>
                                    <span>
                                      {formatDistanceToNow(
                                        new Date(message.receivedAt),
                                        {
                                          addSuffix: true,
                                        },
                                      )}
                                    </span>
                                  </div>
                                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">
                                    {message.messageBody}
                                  </p>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>

                  <form onSubmit={handleReply} className="space-y-3 border-t pt-4">
                    <Textarea
                      value={replyMessage}
                      onChange={(event) => setReplyMessage(event.target.value)}
                      placeholder="Type a reply to send through WhatsApp"
                      rows={4}
                      className="resize-none"
                    />
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-xs text-muted-foreground">
                        Replies are sent from the configured WhatsApp support
                        number and stored in the conversation history.
                      </p>
                      <Button
                        type="submit"
                        disabled={
                          !selectedThreadPhoneNumber ||
                          !replyMessage.trim() ||
                          replyMutation.isPending
                        }
                        className="gap-2"
                      >
                        {replyMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                        Send reply
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </>
            ) : (
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                No thread selected.
              </CardContent>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
