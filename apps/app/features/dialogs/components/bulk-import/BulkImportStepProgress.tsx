import { DocitaLoadingIndicator } from "@workspace/ui/components/docita-loading-indicator";

import { Progress } from "@workspace/ui/components/progress";

interface BulkImportStepProgressProps {
  progress: number;
}

export function BulkImportStepProgress({
  progress,
}: BulkImportStepProgressProps) {
  return (
    <div className="space-y-8 py-8">
      <div
        className="space-y-2 text-center"
        role="status"
        aria-live="polite"
        aria-label="Import in progress"
      >
        <DocitaLoadingIndicator
          variant="section"
          withStatusRole={false}
          className="mx-auto"
          iconClassName="h-10 w-10 text-primary"
        />
        <h3 className="font-semibold">Importing data…</h3>
        <p className="text-sm text-muted-foreground">
          Please wait while we process your file.
        </p>
      </div>
      <div className="space-y-2 px-4">
        <Progress value={progress} className="h-2" />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Processing…</span>
          <span>{Math.round(progress)}%</span>
        </div>
      </div>
    </div>
  );
}
