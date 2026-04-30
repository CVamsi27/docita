import { Download, Loader2 } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { EntityType } from "./types";

interface BulkImportStepDownloadProps {
  selectedEntity: EntityType;
  isLoadingTemplate: boolean;
  onDownloadTemplate: () => void;
}

export function BulkImportStepDownload({
  selectedEntity,
  isLoadingTemplate,
  onDownloadTemplate,
}: BulkImportStepDownloadProps) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-border/70 bg-background/70 text-primary">
          <Download className="h-6 w-6" />
        </div>
        <h3 className="font-semibold">Download Template</h3>
        <p className="text-sm text-muted-foreground">
          Get the CSV template for {selectedEntity.toLowerCase()} import.
        </p>
      </div>
      <Button
        variant="outline"
        onClick={onDownloadTemplate}
        disabled={isLoadingTemplate}
        className="w-full h-24 border-dashed border-2 text-lg gap-3"
      >
        {isLoadingTemplate ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading template...
          </>
        ) : (
          <>
            <Download className="h-5 w-5" />
            Download CSV Template
          </>
        )}
      </Button>
      <div className="surface-info rounded-[var(--radius)] p-4">
        <p className="text-sm">
          <span className="font-semibold">Note:</span> Fill the CSV template
          with your data. Make sure not to change the header columns.
        </p>
      </div>
    </div>
  );
}
