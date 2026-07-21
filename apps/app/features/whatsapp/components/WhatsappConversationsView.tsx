"use client";

import Link from "next/link";
import { useState } from "react";
import { MessageCircle, Send } from "lucide-react";
import { useClinicWhatsappConversationMessages, useClinicWhatsappConversations, useMarkClinicWhatsappConversationRead, useReplyToClinicWhatsappConversation } from "@workspace/data-access";
import { Badge, Button, Card, CardContent, DataState, Textarea } from "@workspace/ui/components";

export function WhatsappConversationsView() {
  const conversations = useClinicWhatsappConversations();
  const [selectedId, setSelectedId] = useState("");
  const [reply, setReply] = useState("");
  const selected = selectedId || conversations.data?.[0]?.id || "";
  const messages = useClinicWhatsappConversationMessages(selected);
  const markRead = useMarkClinicWhatsappConversationRead();
  const sendReply = useReplyToClinicWhatsappConversation();

  if (conversations.isLoading) return (
      <DataState status="loading" loadingMessage="Loading conversations..." />
    );
  if (conversations.isError) {
    return (
      <DataState
        status="error"
        errorMessage="We could not load WhatsApp conversations."
        onRetry={() => void conversations.refetch()}
      />
    );
  }
  if (!conversations.data?.length) {
    return (
      <DataState
        status="empty"
        emptyIcon={MessageCircle}
        emptyTitle="No patient conversations yet"
        emptyDescription="Replies and staff outreach will appear here after a patient message is linked to your clinic."
      />
    );
  }

  const active = conversations.data.find((item) => item.id === selected);
  return (
    <div className="grid gap-4 lg:grid-cols-[18rem_minmax(0,1fr)]">
      <Card>
        <CardContent className="divide-y p-0">
          {conversations.data.map((item) => (
            <Button
              key={item.id}
              type="button"
              variant="ghost"
              onClick={() => {
                setSelectedId(item.id);
                markRead.mutate({ id: item.id });
              }}
              className="h-auto w-full justify-start rounded-none p-3 text-left"
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">
                  {item.patientName ?? item.maskedPhoneNumber}
                </span>
                <span className="block truncate text-xs text-muted-foreground">
                  {item.lastMessagePreview ?? "No message preview"}
                </span>
              </span>
              {item.unreadCount > 0 ? <Badge>{item.unreadCount}</Badge> : null}
            </Button>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium">
                {active?.patientName ?? active?.maskedPhoneNumber}
              </p>
              <p className="text-xs text-muted-foreground">
                {active?.maskedPhoneNumber}
              </p>
            </div>
            {active?.patientId ? (
              <Button variant="outline" size="sm" asChild>
                <Link href={`/patients/${active.patientId}?tab=communication`}>
                  Open patient
                </Link>
              </Button>
            ) : null}
          </div>
          {messages.isLoading ? (
            <DataState status="loading" loadingMessage="Loading messages..." />
          ) : messages.data?.length ? (
            <div className="max-h-[28rem] space-y-2 overflow-y-auto">
              {messages.data.map((message) => (
                <div
                  key={message.id}
                  className={`max-w-[85%] rounded-lg border p-3 text-sm ${
                    message.direction === "OUTBOUND"
                      ? "ml-auto bg-muted/40"
                      : ""
                  }`}
                >
                  <p>{message.content}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {message.direction === "OUTBOUND"
                      ? message.status
                      : "Received"}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <DataState status="empty" emptyTitle="No messages in this thread" />
          )}
          <div className="space-y-2">
            <Textarea
              value={reply}
              onChange={(event) => setReply(event.target.value)}
              placeholder="Enter reply"
              aria-label="Reply"
            />
            <div className="flex justify-end">
              <Button
                type="button"
                disabled={!reply.trim() || sendReply.isPending}
                onClick={() =>
                  sendReply.mutate(
                    { id: selected, text: reply.trim() },
                    { onSuccess: () => setReply("") },
                  )
                }
              >
                <Send className="size-4" />
                Send reply
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
