"use client";

import { Card, CardContent } from "@workspace/ui/components/indicators/card";
import type { FormEvent } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import type { SupportWhatsAppMessage, SupportWhatsAppThreadSummary } from "@workspace/types";
import {
  SupportInboxMessagesSection,
  SupportInboxReplyForm,
  SupportInboxThreadHeader,
} from "./support-inbox-thread-sections";

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
          <SupportInboxThreadHeader selectedThread={selectedThread} />

          <CardContent className="space-y-4 p-5">
            <SupportInboxMessagesSection
              threadMessages={threadMessages}
              isLoading={threadMessagesQuery.isLoading}
              isError={threadMessagesQuery.isError}
              errorMessage={threadMessagesErrorMessage}
            />

            <SupportInboxReplyForm
              replyMessage={replyMessage}
              onReplyMessageChange={onReplyMessageChange}
              onSubmit={onReply}
              replyPending={replyPending}
              selectedThreadPhoneNumber={selectedThreadPhoneNumber}
            />
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
