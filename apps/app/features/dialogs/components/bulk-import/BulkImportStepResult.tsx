import { CheckCircle2 } from "lucide-react";
import { Button } from "@workspace/ui/components/button";

interface BulkImportStepResultProps {
  jobSummary?: {
    successRows: number;
    failedRows: number;
    totalRows: number;
    status: string;
  } | null;
  onImportAnother: () => void;
  onClose: () => void;
}

export function BulkImportStepResult({
  jobSummary,
  onImportAnother,
  onClose,
}: BulkImportStepResultProps) {
  const partial = jobSummary && jobSummary.failedRows > 0;
  const failed = jobSummary?.status === "FAILED";

  return (
    <div className="space-y-6 py-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <div
          className={
            failed
              ? "surface-danger h-16 w-16 rounded-full flex items-center justify-center"
              : "surface-success h-16 w-16 rounded-full flex items-center justify-center"
          }
        >
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <div>
          <h3
            className={
              failed
                ? "text-lg font-semibold text-destructive"
                : "text-lg font-semibold text-success"
            }
          >
            {failed ? "Import failed" : partial ? "Import finished with errors" : "Import complete"}
          </h3>
          {jobSummary ? (
            <p className="text-muted-foreground mt-1 max-w-sm mx-auto text-sm">
              {jobSummary.successRows} of {jobSummary.totalRows} row(s) imported
              successfully
              {jobSummary.failedRows > 0
                ? `; ${jobSummary.failedRows} row(s) failed.`
                : "."}
            </p>
          ) : (
            <p className="text-muted-foreground mt-1 max-w-xs mx-auto text-sm">
              Your import has finished processing.
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-col gap-2 pt-4">
        <Button variant="outline" onClick={onImportAnother} className="w-full">
          Import Another File
        </Button>
        <Button onClick={onClose} className="w-full">
          Done
        </Button>
      </div>
    </div>
  );
}
