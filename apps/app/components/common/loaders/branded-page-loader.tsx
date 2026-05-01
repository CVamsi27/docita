import { DocitaLoadingIndicator } from "@workspace/ui";

interface BrandedPageLoaderProps {
  label?: string;
}

export function BrandedPageLoader({ label = "Loading..." }: BrandedPageLoaderProps) {
  return (
    <div
      className="relative flex min-h-[60vh] flex-col items-center justify-center gap-4"
      role="status"
      aria-label={label}
    >
      <RouteLoadingBackdrop className="pointer-events-none absolute inset-0 opacity-[0.35]" />
      <div className="relative z-[1] flex flex-col items-center gap-4">
        <DocitaLoadingIndicator variant="page" withStatusRole={false} />
        <p className="text-sm text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function RouteLoadingBackdrop({ className }: { className?: string }) {
  return (
    <div
      className={className}
      aria-hidden
    >
      <div className="mx-auto flex h-full max-w-4xl flex-col gap-4 px-4 pt-6">
        <div className="h-8 w-48 rounded-md bg-muted" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-lg border border-border/40 bg-muted/50" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="h-48 rounded-lg border border-border/40 bg-muted/40 lg:col-span-2" />
          <div className="h-48 rounded-lg border border-border/40 bg-muted/40" />
        </div>
      </div>
    </div>
  );
}
