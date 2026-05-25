"use client";

import React from "react";
import { Upload } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/overlay/dialog";
import { cn } from "@workspace/ui/lib/utils";
import { BulkImportStepSelect } from "./bulk-import/BulkImportStepSelect";
import { BulkImportStepDownload } from "./bulk-import/BulkImportStepDownload";
import { BulkImportStepUpload } from "./bulk-import/BulkImportStepUpload";
import { BulkImportStepProgress } from "./bulk-import/BulkImportStepProgress";
import { BulkImportStepResult } from "./bulk-import/BulkImportStepResult";
import { BulkImportStep, EntityType, STEPS } from "./bulk-import/types";

export type { EntityType, BulkImportStep };

export interface BulkImportDialogUIProps {
  isOpen: boolean;
  step: BulkImportStep;
  selectedEntity: EntityType;
  progress: number;
  isLoadingTemplate: boolean;
  isImporting: boolean;
  /** When true, no in-dialog trigger button (caller opens the dialog). */
  hideTrigger?: boolean;
  jobSummary?: {
    successRows: number;
    failedRows: number;
    totalRows: number;
    status: string;
  } | null;
  dpdpAttestationConfirmed: boolean;
  onDpdpAttestationChange: (confirmed: boolean) => void;
  onOpen: () => void;
  onClose: () => void;
  onSelectEntity: (entity: EntityType) => void;
  onContinue: () => void;
  onDownloadTemplate: () => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImportAnother: () => void;
}

export function BulkImportDialogUI({
  isOpen,
  step,
  selectedEntity,
  progress,
  isLoadingTemplate,
  isImporting,
  hideTrigger = false,
  jobSummary,
  dpdpAttestationConfirmed,
  onDpdpAttestationChange,
  onOpen,
  onClose,
  onSelectEntity,
  onContinue,
  onDownloadTemplate,
  onFileUpload,
  onImportAnother,
}: BulkImportDialogUIProps) {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      {!hideTrigger ? (
        <DialogTrigger asChild>
          <Button onClick={onOpen} className="gap-2">
            <Upload className="h-4 w-4" />
            Bulk Import
          </Button>
        </DialogTrigger>
      ) : null}

      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Bulk Import Data</DialogTitle>
          <DialogDescription>
            Import data into Docita using CSV files. Follow the steps below.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6">
          <div className="mb-8 flex items-center justify-between px-2">
            {STEPS.map((s, idx) => (
              <React.Fragment key={s}>
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                    STEPS.indexOf(s) <= STEPS.indexOf(step)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {idx + 1}
                </div>
                {idx < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "flex-1 h-1 mx-2 rounded-full transition-colors",
                      STEPS.indexOf(s) < STEPS.indexOf(step)
                        ? "bg-primary"
                        : "bg-muted",
                    )}
                  />
                )}
              </React.Fragment>
            ))}
          </div>

          {step === "select" && (
            <BulkImportStepSelect
              selectedEntity={selectedEntity}
              onSelectEntity={onSelectEntity}
              onContinue={onContinue}
            />
          )}

          {step === "download" && (
            <BulkImportStepDownload
              selectedEntity={selectedEntity}
              isLoadingTemplate={isLoadingTemplate}
              onDownloadTemplate={onDownloadTemplate}
            />
          )}

          {step === "upload" && (
            <BulkImportStepUpload
              isImporting={isImporting}
              onFileUpload={onFileUpload}
              requireDpdpAttestation={selectedEntity === "PATIENT"}
              dpdpAttestationConfirmed={dpdpAttestationConfirmed}
              onDpdpAttestationChange={onDpdpAttestationChange}
            />
          )}

          {step === "progress" && (
            <BulkImportStepProgress progress={progress} />
          )}

          {step === "result" && (
            <BulkImportStepResult
              jobSummary={jobSummary}
              onImportAnother={onImportAnother}
              onClose={onClose}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
