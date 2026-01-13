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
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary">
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
      <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-4 border border-blue-200 dark:border-blue-900">
        <p className="text-sm text-blue-900 dark:text-blue-200">
          <span className="font-semibold">Note:</span> Fill the CSV template
          with your data. Make sure not to change the header columns.
        </p>
      </div>
    </div>
  );
}
