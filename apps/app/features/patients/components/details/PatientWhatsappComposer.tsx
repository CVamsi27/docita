"use client";

import { useMemo, useState } from "react";
import { History, Info, MessageCircle, Send } from "lucide-react";
import { toast } from "sonner";
import type { ClinicWhatsappSentMessage } from "@workspace/types";
import {
  useClinicWhatsappTemplates,
  usePatientWhatsappSentMessages,
  useSendCustomWhatsAppMessage,
} from "@workspace/data-access";
import { Button } from "@workspace/ui/components/form/button";
import { Textarea } from "@workspace/ui/components/form/textarea";
import { Label } from "@workspace/ui/components/form/label";
import { Badge } from "@workspace/ui/components/indicators/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import {
  Alert,
  AlertDescription,
} from "@workspace/ui/components/feedback/alert";
import { DataState } from "@workspace/ui/components/data-display/data-state";
import { getUserFacingErrorMessage } from "@workspace/utils";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";

function formatSentAt(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

const FAILED_STATUSES = new Set(["FAILED", "UNDELIVERED", "REJECTED"]);

const MAX_LENGTH = 4096;
const NO_TEMPLATE = "__none__";

interface PatientWhatsappComposerProps {
  patientId: string;
  patientName: string;
  phoneNumber?: string | null;
}

export function PatientWhatsappComposer({
  patientId,
  patientName,
  phoneNumber,
}: PatientWhatsappComposerProps) {
  const trimmedPhone = phoneNumber?.trim() ?? "";
  const [message, setMessage] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState(NO_TEMPLATE);

  const templatesQuery = useClinicWhatsappTemplates();
  const historyQuery = usePatientWhatsappSentMessages(patientId);
  const sendMessage = useSendCustomWhatsAppMessage();

  const templates = useMemo(
    () => (templatesQuery.data ?? []).filter((t) => t.isActive),
    [templatesQuery.data],
  );

  const handleSelectTemplate = (value: string) => {
    setSelectedTemplateId(value);
    if (value === NO_TEMPLATE) return;
    const template = templates.find((t) => t.id === value);
    if (template) {
      setMessage(template.content);
    }
  };

  const trimmedMessage = message.trim();
  const canSend =
    Boolean(trimmedPhone) &&
    trimmedMessage.length > 0 &&
    !sendMessage.isPending;

  const handleSend = async () => {
    if (!canSend) return;
    try {
      await sendMessage.mutateAsync({
        text: trimmedMessage,
        patientId,
      });
      toast.success(`Message sent to ${patientName}`);
      setMessage("");
      setSelectedTemplateId(NO_TEMPLATE);
      void historyQuery.refetch();
    } catch (error) {
      showUserFacingErrorToast(
        getUserFacingErrorMessage(error, {
          fallback:
            "We could not send this message. WhatsApp only delivers free-text messages within 24 hours of the patient's last reply.",
          context: "upload",
        }),
      );
    }
  };

  if (!trimmedPhone) {
    return (
      <div data-testid="patient-communication-tab">
        <DataState
          status="empty"
          emptyIcon={MessageCircle}
          emptyTitle="No phone number on file"
          emptyDescription="Add a phone number to this patient's profile to send WhatsApp messages."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4" data-testid="patient-communication-tab">
      <div className="ui-card-surface space-y-4 p-5">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">Send a WhatsApp message</h2>
        </div>

        <div className="space-y-2">
          <Label htmlFor="whatsapp-template">Start from a template</Label>
          <Select
            value={selectedTemplateId}
            onValueChange={handleSelectTemplate}
            disabled={templatesQuery.isLoading || templates.length === 0}
          >
            <SelectTrigger id="whatsapp-template" className="w-full">
              <SelectValue
                placeholder={
                  templates.length === 0
                    ? "No saved templates yet"
                    : "Choose a template (optional)"
                }
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_TEMPLATE}>No template</SelectItem>
              {templates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="whatsapp-message">Message</Label>
          <Textarea
            id="whatsapp-message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Enter message"
            rows={6}
            maxLength={MAX_LENGTH}
          />
          <p className="text-right text-xs text-muted-foreground">
            {message.length}/{MAX_LENGTH}
          </p>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Free-text messages only deliver within 24 hours of the
            patient&apos;s last reply. Outside that window, WhatsApp requires a
            pre-approved template.
          </AlertDescription>
        </Alert>

        <div className="flex justify-end">
          <Button onClick={() => void handleSend()} disabled={!canSend}>
            <Send className="mr-2 h-4 w-4" />
            {sendMessage.isPending ? "Sending…" : "Send message"}
          </Button>
        </div>
      </div>

      <SentMessageHistory
        messages={historyQuery.data ?? []}
        isLoading={historyQuery.isLoading}
        isError={historyQuery.isError}
        onRetry={() => void historyQuery.refetch()}
      />
    </div>
  );
}

interface SentMessageHistoryProps {
  messages: ClinicWhatsappSentMessage[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

function SentMessageHistory({
  messages,
  isLoading,
  isError,
  onRetry,
}: SentMessageHistoryProps) {
  return (
    <div className="ui-card-surface space-y-3 p-5">
      <div className="flex items-center gap-2">
        <History className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">Sent messages</h2>
      </div>

      {isLoading ? (
        <DataState status="loading" loadingMessage="Loading sent messages…" />
      ) : isError ? (
        <DataState
          status="error"
          errorMessage="We could not load sent messages."
          onRetry={onRetry}
        />
      ) : messages.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No messages have been sent to this patient yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {messages.map((entry) => (
            <li
              key={entry.id}
              className="rounded-lg border border-border/60 bg-background/60 p-3"
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">
                  {formatSentAt(entry.createdAt)}
                </span>
                <Badge
                  variant={
                    FAILED_STATUSES.has(entry.status)
                      ? "destructive"
                      : "secondary"
                  }
                  className="text-[var(--fs-2xs)]"
                >
                  {entry.status}
                </Badge>
              </div>
              <p className="whitespace-pre-wrap text-sm text-foreground">
                {entry.message}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
