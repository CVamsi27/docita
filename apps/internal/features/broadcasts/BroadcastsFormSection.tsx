"use client";

import type { ChangeEvent, FormEvent } from "react";
import type { UseMutationResult } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import type { BroadcastPresetId } from "./broadcast-presets";
import {
  AudiencePresetSection,
  BroadcastNameSection,
  ErrorAlertSection,
  ParseResultSection,
  RecipientsCsvSection,
  SendModeSection,
  SubmitSection,
} from "./BroadcastsFormSectionSections";

interface ParseCsvResult {
  recipients: { phoneNumber: string; name?: string }[];
  skipped: { row: number; reason: string }[];
  totalRows: number;
}

interface BroadcastsFormSectionProps {
  presetId: BroadcastPresetId | string;
  onPresetIdChange: (value: BroadcastPresetId) => void;
  title: string;
  onTitleChange: (value: string) => void;
  messageOverride: string;
  onMessageOverrideChange: (value: string) => void;
  useTemplate: boolean;
  onUseTemplateChange: (value: boolean) => void;
  csvFileName: string | null;
  csvError: string | null;
  submitError: string | null;
  parseResult: ParseCsvResult | null;
  recipientCount: number;
  skippedRows: { row: number; reason: string }[];
  createMutation: Pick<
    UseMutationResult,
    "isPending"
  >;
  selectedPresetDescription: string | undefined;
  selectedPresetMetaTemplateName: string | undefined;
  selectedPresetBody: string | undefined;
  onCsvUpload: (event: ChangeEvent<HTMLInputElement>) => Promise<void>;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function BroadcastsFormSection({
  presetId,
  onPresetIdChange,
  title,
  onTitleChange,
  messageOverride,
  onMessageOverrideChange,
  useTemplate,
  onUseTemplateChange,
  csvFileName,
  csvError,
  submitError,
  parseResult,
  recipientCount,
  skippedRows,
  createMutation,
  selectedPresetDescription,
  selectedPresetMetaTemplateName,
  selectedPresetBody,
  onCsvUpload,
  onSubmit,
}: BroadcastsFormSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">New broadcast</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-5">
          <AudiencePresetSection
            presetId={presetId}
            onPresetIdChange={onPresetIdChange}
            selectedPresetDescription={selectedPresetDescription}
          />

          <BroadcastNameSection
            title={title}
            onTitleChange={onTitleChange}
          />

          <SendModeSection
            useTemplate={useTemplate}
            onUseTemplateChange={onUseTemplateChange}
            messageOverride={messageOverride}
            onMessageOverrideChange={onMessageOverrideChange}
            selectedPresetMetaTemplateName={selectedPresetMetaTemplateName}
            selectedPresetBody={selectedPresetBody}
          />

          <RecipientsCsvSection
            csvFileName={csvFileName}
            onCsvUpload={onCsvUpload}
          />

          <ParseResultSection
            parseResult={parseResult}
            recipientCount={recipientCount}
            skippedRows={skippedRows}
          />

          <ErrorAlertSection message={csvError} />
          <ErrorAlertSection message={submitError} />

          <SubmitSection
            parseResult={parseResult}
            isPending={createMutation.isPending}
          />
        </form>
      </CardContent>
    </Card>
  );
}
