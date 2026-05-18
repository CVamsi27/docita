"use client";

import { type ChangeEvent, type FormEvent, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
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
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import {
  getUserFacingErrorMessage,
  WhatsAppBroadcastJobSummary,
} from "@workspace/types";
import { DATE_FORMATS, formatDate, formatDistanceToNow } from "@workspace/utils";
import { AlertCircle, FileText, Megaphone, Send, Upload } from "lucide-react";
import { broadcastsAPI } from "@/lib/api/api";
import { internalQueryKeys } from "@/lib/api/query-keys";
import { useInternalQuery } from "@/lib/api/use-internal-query";
import {
  BROADCAST_PRESETS,
  type BroadcastPresetId,
} from "./broadcast-presets";
import { parseRecipientsCsv } from "./parse-csv";

const BROADCAST_LIST_LIMIT = 50;

const STATUS_VARIANTS: Record<
  WhatsAppBroadcastJobSummary["status"],
  "default" | "secondary" | "destructive"
> = {
  PENDING: "secondary",
  RUNNING: "default",
  COMPLETED: "secondary",
  FAILED: "destructive",
  CANCELLED: "secondary",
};

export function BroadcastsPage() {
  const queryClient = useQueryClient();
  const [presetId, setPresetId] = useState<BroadcastPresetId>(
    BROADCAST_PRESETS[0]!.id,
  );
  const [title, setTitle] = useState("");
  const [messageOverride, setMessageOverride] = useState("");
  const [useTemplate, setUseTemplate] = useState(true);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<ReturnType<
    typeof parseRecipientsCsv
  > | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const selectedPreset = useMemo(
    () => BROADCAST_PRESETS.find((preset) => preset.id === presetId) ?? null,
    [presetId],
  );

  const listKey = internalQueryKeys.internal.broadcasts(BROADCAST_LIST_LIMIT);
  const broadcastsQuery = useInternalQuery({
    queryKey: listKey,
    queryFn: () => broadcastsAPI.list(BROADCAST_LIST_LIMIT),
  });

  const createMutation = useMutation({
    mutationFn: broadcastsAPI.create,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: listKey });
      setCsvFileName(null);
      setParseResult(null);
      setTitle("");
      setMessageOverride("");
    },
    onError: (error) => {
      setSubmitError(
        getUserFacingErrorMessage(error, {
          context: "save",
          fallback: "We could not start the broadcast. Please try again.",
        }),
      );
    },
  });

  const handleCsvUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setCsvError(null);
    setSubmitError(null);
    setCsvFileName(file.name);

    try {
      const text = await file.text();
      const result = parseRecipientsCsv(text);
      setParseResult(result);
      if (result.recipients.length === 0) {
        setCsvError(
          "No valid phone numbers were found in the CSV. Check the file and try again.",
        );
      }
    } catch (error) {
      setCsvError(
        error instanceof Error
          ? error.message
          : "We could not read this CSV file.",
      );
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);

    if (!selectedPreset) {
      setSubmitError("Select an audience preset");
      return;
    }
    if (!parseResult || parseResult.recipients.length === 0) {
      setSubmitError("Upload a CSV with at least one valid phone number");
      return;
    }

    const finalTitle =
      title.trim() ||
      `${selectedPreset.label} — ${formatDate(new Date(), DATE_FORMATS.DATETIME_LONG)}`;

    const recipients = parseResult.recipients.map((recipient) => ({
      phoneNumber: recipient.phoneNumber,
      name: recipient.name,
      variables: recipient.name ? { name: recipient.name } : undefined,
    }));

    createMutation.mutate({
      title: finalTitle,
      audienceLabel: selectedPreset.audienceLabel,
      languageCode: "en",
      templateName: useTemplate ? selectedPreset.metaTemplateName : undefined,
      messageText: useTemplate
        ? undefined
        : (messageOverride.trim() || selectedPreset.body),
      recipients,
    });
  };

  const jobs = broadcastsQuery.data ?? [];
  const skippedRows = parseResult?.skipped ?? [];
  const recipientCount = parseResult?.recipients.length ?? 0;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
          <Megaphone className="h-3.5 w-3.5" />
          WhatsApp Broadcasts
        </div>
        <h1 className="ui-page-title text-[var(--fs-2xl)] sm:text-[var(--fs-3xl)]">
          Broadcast Messages
        </h1>
        <p className="ui-page-subtitle">
          Upload a CSV of phone numbers and send a WhatsApp campaign through the
          Docita support number. Replies land in the Support WhatsApp inbox.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">New broadcast</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="broadcast-audience">Audience preset</Label>
                <Select
                  value={presetId}
                  onValueChange={(value) =>
                    setPresetId(value as BroadcastPresetId)
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
                {selectedPreset && (
                  <p className="text-xs text-muted-foreground">
                    {selectedPreset.description}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="broadcast-title">Broadcast name (optional)</Label>
                <Input
                  id="broadcast-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
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
                      onClick={() => setUseTemplate(true)}
                    >
                      Meta template
                    </Button>
                    <Button
                      type="button"
                      variant={!useTemplate ? "default" : "outline"}
                      size="sm"
                      onClick={() => setUseTemplate(false)}
                    >
                      Free text
                    </Button>
                  </div>
                </div>
                {useTemplate ? (
                  <p className="text-xs text-muted-foreground">
                    Will send the approved Meta template{" "}
                    <code className="rounded bg-muted px-1.5 py-0.5">
                      {selectedPreset?.metaTemplateName}
                    </code>{" "}
                    with the recipient name as a variable.
                  </p>
                ) : (
                  <Textarea
                    value={messageOverride}
                    onChange={(event) => setMessageOverride(event.target.value)}
                    placeholder={selectedPreset?.body ?? ""}
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
                    onChange={handleCsvUpload}
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
                    <details className="mt-3 text-xs">
                      <summary className="cursor-pointer text-muted-foreground">
                        Show skipped rows
                      </summary>
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
                    </details>
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

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent broadcasts</CardTitle>
          </CardHeader>
          <CardContent>
            {broadcastsQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : jobs.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No broadcasts yet. Send your first one to see it here.
              </p>
            ) : (
              <ul className="space-y-3">
                {jobs.map((job) => (
                  <li
                    key={job.id}
                    className="rounded-[var(--radius)] border bg-background p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 space-y-1">
                        <p className="truncate text-sm font-medium">
                          {job.title}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {job.audienceLabel ?? "—"}
                        </p>
                      </div>
                      <Badge variant={STATUS_VARIANTS[job.status]}>
                        {job.status}
                      </Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span>Sent {job.sentCount}/{job.totalCount}</span>
                      {job.failedCount > 0 && (
                        <span className="text-destructive">
                          {job.failedCount} failed
                        </span>
                      )}
                      <span>{formatDistanceToNow(job.createdAt)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
