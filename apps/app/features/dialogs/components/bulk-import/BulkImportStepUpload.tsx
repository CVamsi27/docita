import React from "react";
import { Upload } from "lucide-react";

interface BulkImportStepUploadProps {
  isImporting: boolean;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function BulkImportStepUpload({
  isImporting,
  onFileUpload,
}: BulkImportStepUploadProps) {
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
      <label className="flex h-48 w-full cursor-pointer flex-col items-center justify-center rounded-[var(--radius)] border-2 border-dashed border-muted-foreground/25 transition-all hover:border-border/80 hover:bg-muted/50">
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <Upload className="h-10 w-10 text-muted-foreground mb-3" />
          <p className="mb-2 text-sm text-muted-foreground">
            <span className="font-semibold">Click to upload</span> or drag and
            drop
          </p>
          <p className="text-xs text-muted-foreground">CSV files up to 50MB</p>
        </div>
        <input
          type="file"
          accept=".csv"
          onChange={onFileUpload}
          disabled={isImporting}
          className="hidden"
        />
      </label>
    </div>
  );
}
