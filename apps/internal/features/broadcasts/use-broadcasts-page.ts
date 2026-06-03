"use client";

import { type ChangeEvent, type FormEvent, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useInternalBroadcastsList } from "@workspace/data-access/internal";
import { broadcastsAPI } from "@/lib/api/api";
import { internalQueryKeys } from "@/lib/api/query-keys";
import { BROADCAST_PRESETS } from "./broadcast-presets";
import { parseRecipientsCsv } from "./parse-csv";
import {
  BROADCAST_LIST_LIMIT, buildDefaultTitle,
  buildRecipientPayload, CSV_NO_VALID_PHONES_ERROR, getBroadcastsErrorMessage,
  getBroadcastsListStatus, getCsvReadError,
} from "./broadcasts-helpers";

export function useBroadcastsPage() {
  const queryClient = useQueryClient();
  const [presetId, setPresetId] = useState(BROADCAST_PRESETS[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [messageOverride, setMessageOverride] = useState("");
  const [useTemplate, setUseTemplate] = useState(true);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<ReturnType<typeof parseRecipientsCsv> | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const selectedPreset = useMemo(
    () => BROADCAST_PRESETS.find((p) => p.id === presetId) ?? null,
    [presetId],
  );

  const listKey = internalQueryKeys.internal.broadcasts(BROADCAST_LIST_LIMIT);
  const broadcastsQuery = useInternalBroadcastsList(BROADCAST_LIST_LIMIT);

  const createMutation = useMutation({
    mutationFn: broadcastsAPI.create,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: listKey });
      setCsvFileName(null); setParseResult(null); setTitle(""); setMessageOverride("");
    },
    onError: (error) => setSubmitError(
      getBroadcastsErrorMessage(error, "save", "We could not start the broadcast. Please try again."),
    ),
  });

  const handleCsvUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setCsvError(null); setSubmitError(null);
    setCsvFileName(file.name);
    try {
      const text = await file.text();
      const result = parseRecipientsCsv(text);
      setParseResult(result);
      if (result.recipients.length === 0) setCsvError(CSV_NO_VALID_PHONES_ERROR);
    } catch (error) {
      setCsvError(getCsvReadError(error));
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitError(null);
    if (!selectedPreset) { setSubmitError("Select an audience preset"); return; }
    if (!parseResult || parseResult.recipients.length === 0) {
      setSubmitError("Upload a CSV with at least one valid phone number");
      return;
    }
    createMutation.mutate({
      title: title.trim() || buildDefaultTitle(selectedPreset.label),
      audienceLabel: selectedPreset.audienceLabel,
      languageCode: "en",
      templateName: useTemplate ? selectedPreset.metaTemplateName : undefined,
      messageText: useTemplate ? undefined : messageOverride.trim() || selectedPreset.body,
      recipients: buildRecipientPayload(parseResult.recipients),
    });
  };

  return {
    presetId, setPresetId, title, setTitle, messageOverride, setMessageOverride,
    useTemplate, setUseTemplate, csvFileName, csvError, submitError,
    parseResult, selectedPreset, createMutation, handleCsvUpload, handleSubmit,
    jobs: broadcastsQuery.data ?? [],
    skippedRows: parseResult?.skipped ?? [],
    recipientCount: parseResult?.recipients.length ?? 0,
    listStatus: getBroadcastsListStatus(broadcastsQuery),
    listErrorMessage: broadcastsQuery.isError
      ? getBroadcastsErrorMessage(broadcastsQuery.error, "load", "We could not load broadcast history. Please try again.")
      : undefined,
    broadcastsQuery,
  };
}
