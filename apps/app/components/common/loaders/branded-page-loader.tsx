import { DocitaIcon } from "@workspace/ui/components/docita-logo";

interface BrandedPageLoaderProps {
  label?: string;
}

export function BrandedPageLoader({ label = "Loading..." }: BrandedPageLoaderProps) {
  return (
    <div
      className="flex min-h-[60vh] flex-col items-center justify-center gap-4"
      role="status"
      aria-label={label}
    >
      <div className="docita-loading-pulse">
        <DocitaIcon className="h-12 w-12" />
      </div>
      <div className="h-1 w-24 overflow-hidden rounded-full bg-muted">
        <div className="docita-loading-shimmer h-full w-1/2 rounded-full bg-primary/40" />
      </div>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
