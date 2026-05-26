import React from "react";
import { Upload } from "lucide-react";
import {
  DPDP_NOTICE_TEXT_BULK_OPERATOR,
  DPDP_NOTICE_TITLE,
} from "@workspace/types";
import { Checkbox } from "@workspace/ui/components/form/checkbox";

interface BulkImportStepUploadProps {
  isImporting: boolean;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  requireDpdpAttestation?: boolean;
  dpdpAttestationConfirmed?: boolean;
  onDpdpAttestationChange?: (confirmed: boolean) => void;
}

export function BulkImportStepUpload({
  isImporting,
  onFileUpload,
  requireDpdpAttestation = false,
  dpdpAttestationConfirmed = false,
  onDpdpAttestationChange,
}: BulkImportStepUploadProps) {
  const uploadDisabled =
    isImporting || (requireDpdpAttestation && !dpdpAttestationConfirmed);
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-border/70 bg-background/70 text-primary">
          <Upload className="h-6 w-6" />
        </div>
        <h3 className="font-semibold">Upload Data</h3>
        <p className="text-sm text-muted-foreground">
          Upload your filled CSV file here.
        </p>
      </div>

      {requireDpdpAttestation ? (
        <div className="rounded-md border border-border/70 bg-muted/30 p-4">
          <p className="text-sm font-semibold text-foreground">
            {DPDP_NOTICE_TITLE}
            <span aria-hidden className="ml-0.5 text-destructive">
              *
            </span>
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {DPDP_NOTICE_TEXT_BULK_OPERATOR}
          </p>
          <label
            htmlFor="bulk-import-dpdp"
            className="mt-3 flex cursor-pointer items-start gap-2 text-sm"
          >
            <Checkbox
              id="bulk-import-dpdp"
              checked={dpdpAttestationConfirmed}
              onCheckedChange={(checked) =>
                onDpdpAttestationChange?.(checked === true)
              }
            />
            <span>
              I attest that valid DPDP Act, 2023 consent has been obtained for
              every patient in this file.
            </span>
          </label>
        </div>
      ) : null}

      <label
        className={`flex h-48 w-full flex-col items-center justify-center rounded-[var(--radius)] border-2 border-dashed transition-colors duration-150 ${
          uploadDisabled
            ? "cursor-not-allowed border-muted-foreground/15 opacity-60"
            : "cursor-pointer border-muted-foreground/25 hover:border-border/80 hover:bg-muted/50"
        }`}
      >
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <Upload className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="mb-2 text-sm text-muted-foreground">
            <span className="font-semibold">Click to upload</span> or drag and
            drop
          </p>
          <p className="text-xs text-muted-foreground">CSV files up to 50MB</p>
          {requireDpdpAttestation && !dpdpAttestationConfirmed ? (
            <p className="mt-2 text-xs text-destructive">
              Confirm the DPDP attestation above to enable upload.
            </p>
          ) : null}
        </div>
        <input
          type="file"
          accept=".csv"
          onChange={onFileUpload}
          disabled={uploadDisabled}
          className="hidden"
        />
      </label>
    </div>
  );
}
