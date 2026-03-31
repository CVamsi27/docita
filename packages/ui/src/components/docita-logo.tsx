import { cn } from "@workspace/ui/lib/utils";
import { DocitaBrandMark } from "@workspace/ui/lib/docita-brand";

interface DocitaLogoProps {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  showText?: boolean;
}

interface DocitaLogoFullProps {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  tagline?: string;
  taglineClassName?: string;
}

export function DocitaIcon({ className }: { className?: string | undefined }) {
  return (
    <DocitaBrandMark
      className={cn("h-8 w-8", className)}
      suppressHydrationWarning
    />
  );
}

export function DocitaIconMonochrome({ className }: { className?: string | undefined }) {
  return <DocitaIcon className={className} />;
}

export function DocitaLogo({
  className,
  iconClassName,
  textClassName,
  showText = true,
}: DocitaLogoProps) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <DocitaIcon className={cn("h-6 w-6 shrink-0", iconClassName)} />
      {showText && (
        <span
          className={cn(
            "text-2xl font-medium tracking-tight text-foreground lowercase",
            textClassName,
          )}
        >
          docita
        </span>
      )}
    </div>
  );
}

export function DocitaLogoFull({
  className,
  iconClassName,
  textClassName,
  tagline = "Modern Healthcare Solutions",
  taglineClassName,
}: DocitaLogoFullProps) {
  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <DocitaIcon className={cn("h-16 w-16", iconClassName)} />
      <div className="flex flex-col items-center gap-1.5">
        <span
          className={cn(
            "text-3xl font-medium tracking-tight text-foreground lowercase",
            textClassName,
          )}
        >
          docita
        </span>
        {tagline && (
          <span
            className={cn(
              "text-xs font-semibold tracking-widest uppercase text-muted-foreground",
              taglineClassName,
            )}
          >
            {tagline}
          </span>
        )}
      </div>
    </div>
  );
}

export function DocitaWordmark({
  className,
  textClassName,
}: {
  className?: string;
  textClassName?: string;
}) {
  return (
    <span
      className={cn(
        "text-xl font-medium tracking-tight text-foreground lowercase",
        className,
        textClassName,
      )}
    >
      docita
    </span>
  );
}
