import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";

export default function Loading() {
  return (
    <div
      className="flex min-h-[60vh] flex-col items-center justify-center gap-3"
      role="status"
      aria-label="Loading"
    >
      <DocitaLoadingIndicator variant="page" withStatusRole={false} />
      <p className="text-sm text-muted-foreground">Loading…</p>
    </div>
  );
}
