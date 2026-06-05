"use client";

import { AppPageScaffold } from "@workspace/ui/components/layout/app-page-scaffold";
import { PageHeader } from "@workspace/ui/components/layout/page-header";
import { useBroadcastsPage } from "./use-broadcasts-page";
import { BroadcastsFormSection } from "./BroadcastsFormSection";
import { BroadcastsListSection } from "./BroadcastsListSection";

export function BroadcastsPage() {
  const {
    presetId,
    setPresetId,
    title,
    setTitle,
    messageOverride,
    setMessageOverride,
    useTemplate,
    setUseTemplate,
    csvFileName,
    csvError,
    submitError,
    parseResult,
    selectedPreset,
    createMutation,
    handleCsvUpload,
    handleSubmit,
    jobs,
    skippedRows,
    recipientCount,
    listStatus,
    listErrorMessage,
    broadcastsQuery,
  } = useBroadcastsPage();

  return (
    <AppPageScaffold
      header={
        <PageHeader
          title="Broadcast Messages"
          description="Upload a CSV of phone numbers and send a WhatsApp campaign through the Docita support number. Replies land in the Support WhatsApp inbox."
          size="compact"
        />
      }
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <BroadcastsFormSection
          presetId={presetId}
          onPresetIdChange={setPresetId}
          title={title}
          onTitleChange={setTitle}
          messageOverride={messageOverride}
          onMessageOverrideChange={setMessageOverride}
          useTemplate={useTemplate}
          onUseTemplateChange={setUseTemplate}
          csvFileName={csvFileName}
          csvError={csvError}
          submitError={submitError}
          parseResult={parseResult}
          recipientCount={recipientCount}
          skippedRows={skippedRows}
          createMutation={createMutation}
          selectedPresetDescription={selectedPreset?.description}
          selectedPresetMetaTemplateName={selectedPreset?.metaTemplateName}
          selectedPresetBody={selectedPreset?.body}
          onCsvUpload={handleCsvUpload}
          onSubmit={handleSubmit}
        />

        <BroadcastsListSection
          status={listStatus}
          jobs={jobs}
          errorMessage={listErrorMessage}
          onRetry={() => void broadcastsQuery.refetch()}
        />
      </div>
    </AppPageScaffold>
  );
}
