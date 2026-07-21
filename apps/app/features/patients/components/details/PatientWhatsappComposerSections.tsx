"use client";

// jscpd:ignore-start
import { History, Info, MessageCircle, Send } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Textarea } from "@workspace/ui/components/form/form-primitives";
import { Badge, Button, DataState, Label } from "@workspace/ui/components";
import {
  Alert,
// jscpd:ignore-end
  AlertDescription,
} from "@workspace/ui/components/feedback/alert";
import { useTranslations } from "next-intl";
import type { ClinicWhatsappTemplate, ClinicWhatsappSentMessage } from "@workspace/types";

const FAILED_STATUSES = new Set(["FAILED", "UNDELIVERED", "REJECTED"]);
const MAX_LENGTH = 4096;

function formatSentAt(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/**
 * Phase 3 (per-feature): apps/app Patients > WhatsApp composer
 * (2 sub-components: composer form + sent message history). 7 literals
 * converted to useTranslations("Patients.whatsappComposer").
 */
function useWhatsappComposerTranslations() {
  return useTranslations("Patients.whatsappComposer");
}

interface WhatsappComposerFormProps {
  patientName: string;
  message: string;
  onMessageChange: (value: string) => void;
  selectedTemplateId: string;
  onSelectTemplate: (value: string) => void;
  templates: ClinicWhatsappTemplate[];
  templatesLoading: boolean;
  canSend: boolean;
  isPending: boolean;
  onSend: () => Promise<void>;
}

export function WhatsappComposerForm({
  patientName: _patientName,
  message,
  onMessageChange,
  selectedTemplateId,
  onSelectTemplate,
  templates,
  templatesLoading,
  canSend,
  isPending,
  onSend,
}: WhatsappComposerFormProps) {
  const t = useWhatsappComposerTranslations();
  return (
    <div className="ui-card-surface space-y-4 p-5">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">{t("composerTitle")}</h2>
      </div>

      <div className="space-y-2">
        <Label htmlFor="whatsapp-template">{t("templateLabel")}</Label>
        <Select
          value={selectedTemplateId}
          onValueChange={onSelectTemplate}
          disabled={templatesLoading || templates.length === 0}
        >
          <SelectTrigger id="whatsapp-template" className="w-full">
            <SelectValue
              placeholder={
                templates.length === 0
                  ? t("noTemplatesPlaceholder")
                  : t("templatePlaceholder")
              }
            />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">{t("noTemplateOption")}</SelectItem>
            {templates.map((template) => (
              <SelectItem key={template.id} value={template.id}>
                {template.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="whatsapp-message">{t("messageLabel")}</Label>
        <Textarea
          id="whatsapp-message"
          value={message}
          onChange={(event) => onMessageChange(event.target.value)}
          placeholder={t("messagePlaceholder")}
          rows={6}
          maxLength={MAX_LENGTH}
        />
        <p className="text-right text-xs text-muted-foreground">
          {t("charCount", { count: message.length, max: MAX_LENGTH })}
        </p>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          {t("freeTextWarning")}
        </AlertDescription>
      </Alert>

      <div className="flex justify-end">
        <Button onClick={() => void onSend()} disabled={!canSend}>
          <Send className="mr-2 h-4 w-4" />
          {isPending ? t("sendingLabel") : t("sendButton")}
        </Button>
      </div>
    </div>
  );
}

interface SentMessageHistoryProps {
  messages: ClinicWhatsappSentMessage[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

export function SentMessageHistory({
  messages,
  isLoading,
  isError,
  onRetry,
}: SentMessageHistoryProps) {
  const t = useWhatsappComposerTranslations();
  return (
    <div className="ui-card-surface space-y-3 p-5">
      <div className="flex items-center gap-2">
        <History className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold">{t("historyTitle")}</h2>
      </div>

      <DataState
        status={
          isLoading
            ? "loading"
            : isError
              ? "error"
              : messages.length === 0
                ? "empty"
                : "success"
        }
        loadingMessage={t("historyLoadingLabel")}
        errorMessage={t("historyErrorFallback")}
        onRetry={onRetry}
        emptyTitle={t("historyEmptyTitle")}
        emptyDescription={t("historyEmptyDescription")}
      >
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
      </DataState>
    </div>
  );
}
