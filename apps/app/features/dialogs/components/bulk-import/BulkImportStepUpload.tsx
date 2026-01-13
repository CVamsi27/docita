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
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary">
          <Upload className="h-6 w-6" />
        </div>
        <h3 className="font-semibold">Upload Data</h3>
        <p className="text-sm text-muted-foreground">
          Upload your filled CSV file here.
        </p>
      </div>
      <label className="flex flex-col items-center justify-center w-full h-48 rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50 transition-all cursor-pointer">
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
