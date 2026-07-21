"use client";

import { Card, CardContent, DataState } from "@workspace/ui/components";
import { Inbox } from "lucide-react";
import { THREAD_LIMIT } from "./support-helpers";
import { useSupportInbox } from "./use-support-inbox";
import { SupportInboxThreadDetail } from "./support-inbox-thread-detail";
import { SupportInboxThreadList } from "./support-inbox-thread-list";

export { THREAD_LIMIT };

export function SupportInboxPage() {
  const {
    search,
    setSearch,
    selectedThreadPhoneNumber,
    setSelectedThreadPhoneNumber,
    replyMessage,
    setReplyMessage,
    filteredThreads,
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
  } = useSupportInbox();

  const threadsStatus = threadsLoading
    ? "loading"
    : threadsErrorMessage
      ? "error"
      : "success";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-end">
        <div className="grid grid-cols-2 gap-3 sm:min-w-[260px]">
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Threads
              </p>
              <p className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">{totalThreads}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Unread
              </p>
              <p className="text-[var(--fs-2xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">{unreadMessages}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <DataState
        status={threadsStatus}
        loadingMessage="Loading WhatsApp conversations…"
        errorMessage={threadsErrorMessage ?? undefined}
        onRetry={() => void threadsQuery.refetch()}
        emptyTitle="No conversations yet"
        emptyDescription="New WhatsApp messages will appear here when customers contact support."
        emptyIcon={Inbox}
      >
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <SupportInboxThreadList
            filteredThreads={filteredThreads}
            totalThreads={totalThreads}
            unreadMessages={unreadMessages}
            search={search}
            onSearchChange={setSearch}
            selectedThreadPhoneNumber={selectedThreadPhoneNumber}
            onSelectThread={setSelectedThreadPhoneNumber}
          />
          <SupportInboxThreadDetail
            selectedThread={selectedThread}
            threadMessages={threadMessages}
            threadMessagesQuery={threadMessagesQuery}
            threadMessagesErrorMessage={threadMessagesErrorMessage}
            replyMessage={replyMessage}
            onReplyMessageChange={setReplyMessage}
            onReply={handleReply}
            replyPending={replyMutation.isPending}
            selectedThreadPhoneNumber={selectedThreadPhoneNumber}
          />
        </div>
      </DataState>
    </div>
  );
}
