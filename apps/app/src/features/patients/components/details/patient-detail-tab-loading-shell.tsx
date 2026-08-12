import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { Skeleton } from "@workspace/ui/components/feedback/skeleton";

export function PatientDetailTabLoadingShell() {
  return (
    <div
      className="space-y-4 p-2"
      role="status"
      aria-live="polite"
      aria-label="Loading tab content"
    >
      <div className="flex items-center gap-3">
        <DocitaLoadingIndicator
          variant="section"
          withStatusRole={false}
          iconClassName="h-8 w-8"
        />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-full max-w-lg" />
        </div>
      </div>
      <Skeleton className="h-48 w-full rounded-lg md:h-64" />
    </div>
  );
}
