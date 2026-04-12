"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { getUserFacingErrorMessage } from "@workspace/types";
import { internalQueryKeys } from "@/lib/query-keys";
import { supportAPI } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Inbox, MessageSquare, Phone, Search } from "lucide-react";

function getSenderLabel(message: {
  senderName?: string | null;
  senderPhoneNumber: string;
}) {
  return message.senderName?.trim() || message.senderPhoneNumber;
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

export function SupportInboxPage() {
  const { token } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);

  const supportQuery = useQuery({
    queryKey: internalQueryKeys.internal.supportWhatsAppMessages(100),
    queryFn: () => supportAPI.getWhatsAppMessages(100),
    enabled: Boolean(token),
  });

  const messages = useMemo(() => supportQuery.data ?? [], [supportQuery.data]);

  const filteredMessages = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return messages;

    return messages.filter((message) => {
      return [
        message.senderName,
        message.senderPhoneNumber,
        message.supportPhoneNumber,
        message.messageType,
        message.messageBody,
      ]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalized));
    });
  }, [messages, search]);

  useEffect(() => {
    if (filteredMessages.length === 0) {
      if (selectedMessageId !== null) {
        setSelectedMessageId(null);
      }
      return;
    }

    const hasSelectedMessage = filteredMessages.some(
      (message) => message.id === selectedMessageId,
    );

    if (!hasSelectedMessage) {
      setSelectedMessageId(filteredMessages[0]?.id ?? null);
    }
  }, [filteredMessages, selectedMessageId]);

  const selectedMessage = useMemo(() => {
    if (!filteredMessages.length) {
      return null;
    }

    return (
      filteredMessages.find((message) => message.id === selectedMessageId) ??
      filteredMessages[0] ??
      null
    );
  }, [filteredMessages, selectedMessageId]);

  const total = messages.length;
  const newCount = messages.filter((message) => message.status === "NEW").length;
  const loading = supportQuery.isLoading;
  const errorMessage = supportQuery.isError
    ? getUserFacingErrorMessage(supportQuery.error, {
        context: "load",
        fallback: "We could not load WhatsApp messages right now. Please try again.",
      })
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
            <Inbox className="h-3.5 w-3.5" />
            WhatsApp Inbox
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Incoming Messages
            </h1>
            <p className="text-sm text-muted-foreground">
              Live WhatsApp messages received on the onboarding support line.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:min-w-[260px]">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Total
              </p>
              <p className="text-2xl font-bold">{total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                New
              </p>
              <p className="text-2xl font-bold">{newCount}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {loading && (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Loading WhatsApp messages...
          </CardContent>
        </Card>
      )}

      {errorMessage && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-6 text-sm text-destructive">
            {errorMessage}
          </CardContent>
        </Card>
      )}

      {!loading && !errorMessage && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <Card className="min-w-0">
            <CardHeader className="space-y-4 border-b bg-muted/20">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <CardTitle className="text-lg">Messages</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Select a message to review the full details.
                  </p>
                </div>
                <div className="flex flex-col gap-2 text-right">
                  <Badge variant="secondary" className="w-fit self-end">
                    {total} total
                  </Badge>
                  <Badge variant="default" className="w-fit self-end">
                    {newCount} new
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
              {filteredMessages.length === 0 ? (
                <div className="rounded-xl border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                  {search.trim()
                    ? "No WhatsApp messages matched your search."
                    : "No incoming WhatsApp messages yet."}
                </div>
              ) : (
                filteredMessages.map((message) => {
                  const isSelected = message.id === selectedMessage?.id;

                  return (
                    <button
                      key={message.id}
                      type="button"
                      onClick={() => setSelectedMessageId(message.id)}
                      className={[
                        "w-full rounded-xl border p-4 text-left transition-colors",
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
                              {getSenderLabel(message)}
                            </p>
                            <Badge
                              variant={message.status === "NEW" ? "default" : "secondary"}
                            >
                              {message.status}
                            </Badge>
                          </div>
                          <p className="truncate text-xs text-muted-foreground">
                            {message.senderPhoneNumber}
                          </p>
                          <p className="line-clamp-2 text-sm text-muted-foreground">
                            {message.messageBody}
                          </p>
                        </div>
                        <div className="shrink-0 text-right text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(message.receivedAt), {
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
            {selectedMessage ? (
              <>
                <CardHeader className="space-y-4 border-b bg-muted/20">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-lg">
                          {getSenderLabel(selectedMessage)}
                        </CardTitle>
                        <Badge
                          variant={selectedMessage.status === "NEW" ? "default" : "secondary"}
                        >
                          {selectedMessage.status}
                        </Badge>
                      </div>
                      <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                        <a
                          href={getWhatsAppLink(selectedMessage.senderPhoneNumber)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 hover:text-foreground"
                        >
                          <MessageSquare className="h-4 w-4" />
                          Open WhatsApp
                        </a>
                        <p className="inline-flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          {selectedMessage.senderPhoneNumber}
                        </p>
                        <p>Support line: {selectedMessage.supportPhoneNumber}</p>
                        <p>Type: {formatMessageType(selectedMessage.messageType)}</p>
                        <p>
                          Received{" "}
                          {formatDistanceToNow(new Date(selectedMessage.receivedAt), {
                            addSuffix: true,
                          })}
                          {" "}
                          ({format(new Date(selectedMessage.receivedAt), "PPpp")})
                        </p>
                      </div>
                    </div>

                    <Button asChild variant="outline" size="sm">
                      <a
                        href={getWhatsAppLink(selectedMessage.senderPhoneNumber)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open chat
                      </a>
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 p-5">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <MessageSquare className="h-4 w-4" />
                    Message
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
                    {selectedMessage.messageBody}
                  </p>
                </CardContent>
              </>
            ) : (
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                No message selected.
              </CardContent>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
