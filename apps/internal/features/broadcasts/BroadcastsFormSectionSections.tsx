// check-as-cast-density: allow-file — narrowing casts required by generic signatures or external types
"use client";

// jscpd:ignore-start
import type { ChangeEvent } from "react";
import { Button } from "@workspace/ui/components/form/button";
import { Input } from "@workspace/ui/components/form/input";
import { Label } from "@workspace/ui/components/form/label";
import { Textarea } from "@workspace/ui/components/form/textarea";
import { Badge } from "@workspace/ui/components/indicators/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import {
  Collapsible,
// jscpd:ignore-end
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/overlay/collapsible";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { AlertCircle, FileText, Send, Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { BROADCAST_PRESETS, type BroadcastPresetId } from "./broadcast-presets";

interface ParseCsvResult {
  recipients: { phoneNumber: string; name?: string }[];
  skipped: { row: number; reason: string }[];
  totalRows: number;
}

/**
 * Phase 3 (per-feature): apps/internal Broadcasts > Form section
 * (6 form sub-components). 8 literals converted to
 * useTranslations("InternalBroadcasts.form").
 */
function useBroadcastsFormTranslations() {
  return useTranslations("InternalBroadcasts.form");
}

interface AudiencePresetSectionProps {
  presetId: BroadcastPresetId | string;
  onPresetIdChange: (value: BroadcastPresetId) => void;
  selectedPresetDescription: string | undefined;
}

export function AudiencePresetSection({
  presetId,
  onPresetIdChange,
  selectedPresetDescription,
}: AudiencePresetSectionProps) {
  const t = useBroadcastsFormTranslations();
  return (
    <div className="space-y-2">
      <Label htmlFor="broadcast-audience">{t("audiencePresetLabel")}</Label>
      <Select
        value={presetId}
        onValueChange={(value) =>
          onPresetIdChange(value as BroadcastPresetId)
        }
      >
        <SelectTrigger id="broadcast-audience">
          <SelectValue placeholder={t("audiencePlaceholder")} />
        </SelectTrigger>
        <SelectContent>
          {BROADCAST_PRESETS.map((preset) => (
            <SelectItem key={preset.id} value={preset.id}>
              {preset.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selectedPresetDescription && (
        <p className="text-xs text-muted-foreground">
          {selectedPresetDescription}
        </p>
      )}
    </div>
  );
}

interface BroadcastNameSectionProps {
  title: string;
  onTitleChange: (value: string) => void;
}

export function BroadcastNameSection({
  title,
  onTitleChange,
}: BroadcastNameSectionProps) {
  const t = useBroadcastsFormTranslations();
  return (
    <div className="space-y-2">
      <Label htmlFor="broadcast-title">
        {t("broadcastNameLabel")}
      </Label>
      <Input
        id="broadcast-title"
        value={title}
        onChange={(event) => onTitleChange(event.target.value)}
        placeholder={t("broadcastNamePlaceholder")}
      />
    </div>
  );
}

interface SendModeSectionProps {
  useTemplate: boolean;
  onUseTemplateChange: (value: boolean) => void;
  messageOverride: string;
  onMessageOverrideChange: (value: string) => void;
  selectedPresetMetaTemplateName: string | undefined;
  selectedPresetBody: string | undefined;
}

export function SendModeSection({
  useTemplate,
  onUseTemplateChange,
  messageOverride,
  onMessageOverrideChange,
  selectedPresetMetaTemplateName,
  selectedPresetBody,
}: SendModeSectionProps) {
  const t = useBroadcastsFormTranslations();
  return (
    <div className="space-y-2 rounded-[var(--radius)] border p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-0.5">
          <p className="text-sm font-medium">{t("sendModeTitle")}</p>
          <p className="text-xs text-muted-foreground">
            {t("sendModeDescription")}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={useTemplate ? "default" : "outline"}
            size="sm"
            onClick={() => onUseTemplateChange(true)}
          >
            {t("metaTemplateButton")}
          </Button>
          <Button
            type="button"
            variant={!useTemplate ? "default" : "outline"}
            size="sm"
            onClick={() => onUseTemplateChange(false)}
          >
            {t("freeTextButton")}
          </Button>
        </div>
      </div>
      {useTemplate ? (
        <p className="text-xs text-muted-foreground">
          {t("templateHelper", { name: selectedPresetMetaTemplateName ?? "" })}
        </p>
      ) : (
        <Textarea
          value={messageOverride}
          onChange={(event) =>
            onMessageOverrideChange(event.target.value)
          }
          placeholder={selectedPresetBody ?? ""}
          rows={10}
          className="resize-none font-mono text-sm"
        />
      )}
    </div>
  );
}

interface RecipientsCsvSectionProps {
  csvFileName: string | null;
  onCsvUpload: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
}

export function RecipientsCsvSection({
  csvFileName,
  onCsvUpload,
}: RecipientsCsvSectionProps) {
  const t = useBroadcastsFormTranslations();
  return (
    <div className="space-y-2">
      <Label htmlFor="broadcast-csv">
        {t("csvLabel")}
      </Label>
      <div className="flex items-center gap-3">
        <Button asChild type="button" variant="outline">
          <label
            htmlFor="broadcast-csv"
            className="flex cursor-pointer items-center gap-2"
          >
            <Upload className="h-4 w-4" />
            {t("uploadCsvButton")}
          </label>
        </Button>
        <input
          id="broadcast-csv"
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={onCsvUpload}
        />
        {csvFileName && (
          <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" />
            {csvFileName}
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {t("csvHelper")}
      </p>
    </div>
  );
}

interface ParseResultSectionProps {
  parseResult: ParseCsvResult | null;
  recipientCount: number;
  skippedRows: { row: number; reason: string }[];
}

export function ParseResultSection({
  parseResult,
  recipientCount,
  skippedRows,
}: ParseResultSectionProps) {
  const t = useBroadcastsFormTranslations();
  if (!parseResult) return null;

  return (
    <div className="rounded-[var(--radius)] border bg-muted/20 p-4 text-sm">
      <div className="flex flex-wrap items-center gap-3">
        <Badge variant="default">
          {t("validRecipientsBadge", { count: recipientCount })}
        </Badge>
        {skippedRows.length > 0 && (
          <Badge variant="destructive">
            {t("skippedBadge", { count: skippedRows.length })}
          </Badge>
        )}
      </div>
      {skippedRows.length > 0 && (
        <Collapsible className="mt-3 text-xs">
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-auto px-0 text-xs text-muted-foreground"
            >
              {t("showSkippedButton")}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ul className="mt-2 max-h-40 list-disc space-y-1 overflow-y-auto pl-5 text-muted-foreground">
              {skippedRows.slice(0, 50).map((skip, idx) => (
                <li key={idx}>
                  {t("skippedRowEntry", { row: skip.row, reason: skip.reason })}
                </li>
              ))}
              {skippedRows.length > 50 && (
                <li>
                  {t("moreSkippedHint", { count: skippedRows.length - 50 })}
                </li>
              )}
            </ul>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

interface ErrorAlertSectionProps {
  message: string | null;
}

export function ErrorAlertSection({ message }: ErrorAlertSectionProps) {
  if (!message) return null;

  return (
    <div className="flex items-start gap-2 rounded-[var(--radius)] border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
      <AlertCircle className="mt-0.5 h-4 w-4" />
      <span>{message}</span>
    </div>
  );
}

interface SubmitSectionProps {
  parseResult: ParseCsvResult | null;
  isPending: boolean;
}

export function SubmitSection({
  parseResult,
  isPending,
}: SubmitSectionProps) {
  const t = useBroadcastsFormTranslations();
  return (
    <div className="flex items-center justify-between gap-3 border-t pt-4">
      <p className="text-xs text-muted-foreground">
        {t("throttleNote")}
      </p>
      <Button
        type="submit"
        disabled={
          !parseResult ||
          parseResult.recipients.length === 0 ||
          isPending
        }
        className="gap-2"
      >
        {isPending ? (
          <DocitaLoadingIndicator variant="inline" decorative />
        ) : (
          <Send className="h-4 w-4" />
        )}
        {t("startBroadcastButton")}
      </Button>
    </div>
  );
}
