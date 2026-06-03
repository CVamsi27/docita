"use client";

import type { ChangeEvent, FormEvent } from "react";
import type { UseMutationResult } from "@tanstack/react-query";
import { Button } from "@workspace/ui/components/form/button";
import { Input } from "@workspace/ui/components/form/input";
import { Label } from "@workspace/ui/components/form/label";
import { Textarea } from "@workspace/ui/components/form/textarea";
import { Badge } from "@workspace/ui/components/indicators/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/overlay/collapsible";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { AlertCircle, FileText, Send, Upload } from "lucide-react";
import { BROADCAST_PRESETS, type BroadcastPresetId } from "./broadcast-presets";

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
          <div className="space-y-2">
            <Label htmlFor="broadcast-audience">Audience preset</Label>
            <Select
              value={presetId}
              onValueChange={(value) =>
                onPresetIdChange(value as BroadcastPresetId)
              }
            >
              <SelectTrigger id="broadcast-audience">
                <SelectValue placeholder="Select audience" />
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

          <div className="space-y-2">
            <Label htmlFor="broadcast-title">
              Broadcast name (optional)
            </Label>
            <Input
              id="broadcast-title"
              value={title}
              onChange={(event) => onTitleChange(event.target.value)}
              placeholder="Auto-generated from audience + timestamp"
            />
          </div>

          <div className="space-y-2 rounded-[var(--radius)] border p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Send mode</p>
                <p className="text-xs text-muted-foreground">
                  Templates are required when the recipient has never
                  messaged us. Free text works only inside the 24-hour
                  session window.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={useTemplate ? "default" : "outline"}
                  size="sm"
                  onClick={() => onUseTemplateChange(true)}
                >
                  Meta template
                </Button>
                <Button
                  type="button"
                  variant={!useTemplate ? "default" : "outline"}
                  size="sm"
                  onClick={() => onUseTemplateChange(false)}
                >
                  Free text
                </Button>
              </div>
            </div>
            {useTemplate ? (
              <p className="text-xs text-muted-foreground">
                Will send the approved Meta template{" "}
                <code className="rounded bg-muted px-1.5 py-0.5">
                  {selectedPresetMetaTemplateName}
                </code>{" "}
                using the recipient name template variable.
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

          <div className="space-y-2">
            <Label htmlFor="broadcast-csv">
              Recipients CSV (phone column required)
            </Label>
            <div className="flex items-center gap-3">
              <Button asChild type="button" variant="outline">
                <label
                  htmlFor="broadcast-csv"
                  className="flex cursor-pointer items-center gap-2"
                >
                  <Upload className="h-4 w-4" />
                  Upload CSV
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
              CSV must include a header row with a column named{" "}
              <code className="rounded bg-muted px-1 py-0.5">phone</code>{" "}
              (also accepts <code>mobile</code> / <code>number</code>).
              Optional <code>name</code> column is interpolated into{" "}
              <code>{`{{name}}`}</code>. 10-digit numbers are auto-prefixed
              with country code 91.
            </p>
          </div>

          {parseResult && (
            <div className="rounded-[var(--radius)] border bg-muted/20 p-4 text-sm">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="default">
                  {recipientCount} valid recipients
                </Badge>
                {skippedRows.length > 0 && (
                  <Badge variant="destructive">
                    {skippedRows.length} skipped
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
                      Show skipped rows
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <ul className="mt-2 max-h-40 list-disc space-y-1 overflow-y-auto pl-5 text-muted-foreground">
                      {skippedRows.slice(0, 50).map((skip, idx) => (
                        <li key={idx}>
                          Row {skip.row}: {skip.reason}
                        </li>
                      ))}
                      {skippedRows.length > 50 && (
                        <li>
                          … and {skippedRows.length - 50} more skipped rows
                        </li>
                      )}
                    </ul>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          )}

          {csvError && (
            <div className="flex items-start gap-2 rounded-[var(--radius)] border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4" />
              <span>{csvError}</span>
            </div>
          )}

          {submitError && (
            <div className="flex items-start gap-2 rounded-[var(--radius)] border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4" />
              <span>{submitError}</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 border-t pt-4">
            <p className="text-xs text-muted-foreground">
              Sending is throttled (~4 messages/sec) and runs in the
              background. You can close this page.
            </p>
            <Button
              type="submit"
              disabled={
                !parseResult ||
                parseResult.recipients.length === 0 ||
                createMutation.isPending
              }
              className="gap-2"
            >
              {createMutation.isPending ? (
                <DocitaLoadingIndicator variant="inline" decorative />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Start broadcast
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
