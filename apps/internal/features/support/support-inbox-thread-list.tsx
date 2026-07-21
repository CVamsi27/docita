"use client";

import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input
} from "@workspace/ui/components";
import { Search } from "lucide-react";
import { formatDistanceToNow } from "@workspace/utils";
import { formatMessageType, getThreadLabel } from "./support-helpers";
import type { SupportWhatsAppThreadSummary } from "@workspace/types";

interface SupportInboxThreadListProps {
  filteredThreads: SupportWhatsAppThreadSummary[];
  totalThreads: number;
  unreadMessages: number;
  search: string;
  onSearchChange: (value: string) => void;
  selectedThreadPhoneNumber: string | null;
  onSelectThread: (phoneNumber: string) => void;
}

export function SupportInboxThreadList({
  filteredThreads,
  totalThreads,
  unreadMessages,
  search,
  onSearchChange,
  selectedThreadPhoneNumber,
  onSelectThread,
}: SupportInboxThreadListProps) {
  return (
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
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Enter name, phone, or message"
            className="pl-10"
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-3 p-4 sm:p-5">
        {filteredThreads.length === 0 ? (
          <div className="rounded-[var(--radius)] border border-dashed bg-muted/20 p-6 text-center text-sm text-muted-foreground">
            {search.trim()
              ? "No WhatsApp conversations matched your search"
              : "No incoming WhatsApp messages yet"}
          </div>
        ) : (
          filteredThreads.map((thread) => {
            const isSelected =
              thread.threadPhoneNumber === selectedThreadPhoneNumber;

            return (
              <button
                key={thread.threadPhoneNumber}
                type="button"
                onClick={() => onSelectThread(thread.threadPhoneNumber)}
                className={[
                  "w-full rounded-[var(--radius)] border border-border/70 p-4 text-left transition-colors",
                  "hover:bg-muted/30",
                  isSelected
                    ? "bg-muted/50 shadow-sm"
                    : "bg-background",
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
                    {formatDistanceToNow(thread.lastMessageAt)}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
