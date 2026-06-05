"use client";

import { DATE_FORMATS, formatDate, formatDistanceToNow } from "@workspace/utils";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { Button } from "@workspace/ui/components/form/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Textarea } from "@workspace/ui/components/form/textarea";
import { MessageSquare, Phone, Send } from "lucide-react";
import type { FormEvent } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import type { SupportWhatsAppMessage, SupportWhatsAppThreadSummary } from "@workspace/types";
import {
  formatMessageType,
  formatStatusBadgeVariant,
  getMessageAuthor,
  getThreadLabel,
  getWhatsAppLink,
} from "./support-helpers";

interface SupportInboxThreadDetailProps {
  selectedThread: SupportWhatsAppThreadSummary | null;
  threadMessages: SupportWhatsAppMessage[];
  threadMessagesQuery: Pick<
    UseQueryResult,
    "isLoading" | "isError"
  >;
  threadMessagesErrorMessage: string | null;
  replyMessage: string;
  onReplyMessageChange: (value: string) => void;
  onReply: (event: FormEvent<HTMLFormElement>) => void;
  replyPending: boolean;
  selectedThreadPhoneNumber: string | null;
}

export function SupportInboxThreadDetail({
  selectedThread,
  threadMessages,
  threadMessagesQuery,
  threadMessagesErrorMessage,
  replyMessage,
  onReplyMessageChange,
  onReply,
  replyPending,
  selectedThreadPhoneNumber,
}: SupportInboxThreadDetailProps) {
  return (
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
                    rel="noopener noreferrer"
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
                    {formatDistanceToNow(selectedThread.lastMessageAt)}
                    {" "}
                    (
                    {formatDate(selectedThread.lastMessageAt, DATE_FORMATS.DATETIME_LONG)}
                    )
                  </p>
                </div>
              </div>

              <Button asChild variant="outline" size="sm">
                <a
                  href={getWhatsAppLink(selectedThread.threadPhoneNumber)}
                  target="_blank"
                  rel="noopener noreferrer"
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
                  <DocitaLoadingIndicator variant="inline" decorative />
                  Loading conversation…
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
                    <div className="rounded-[var(--radius)] border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
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
                              "max-w-[90%] rounded-[var(--radius)] border p-4 shadow-sm",
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
                                {formatDistanceToNow(message.receivedAt)}
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

            <form onSubmit={onReply} className="space-y-3 border-t pt-4">
              <Textarea
                value={replyMessage}
                onChange={(event) => onReplyMessageChange(event.target.value)}
                placeholder="Enter reply"
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
                    replyPending
                  }
                  className="gap-2"
                >
                  {replyPending ? (
                    <DocitaLoadingIndicator variant="inline" decorative />
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
  );
}
