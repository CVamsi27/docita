
import { CheckCircle2 } from "lucide-react";
import { Button } from "@workspace/ui/components/button";

interface BulkImportStepResultProps {
  onImportAnother: () => void;
  onClose: () => void;
}

export function BulkImportStepResult({
  onImportAnother,
  onClose,
}: BulkImportStepResultProps) {
  return (
    <div className="space-y-6 py-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-green-700 dark:text-green-400">
            Import Successful!
          </h3>
          <p className="text-muted-foreground mt-1 max-w-xs mx-auto">
            Your data has been queued for processing. You&apos;ll be notified
            once it&apos;s complete.
          </p>
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
