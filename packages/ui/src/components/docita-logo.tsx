import { cn } from "@workspace/ui/lib/utils";

// ECG / heartbeat waveform path — center baseline at y=16.
// P wave (small bump), QRS complex (dominant spike), T wave (medium bump).
// Round caps + joins for a smooth, continuous trace.
const ECG_PATH = "M4 16H8L10 13L12 7L14 24L16 16H20L21 11L22 16H28";

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

// Theme-adaptive icon.
// Light mode: white ECG waveform on dark (slate-900) rounded-square — high contrast on light app bg.
// Dark mode: dark (slate-900) ECG waveform on white rounded-square — high contrast on dark app bg.
export function DocitaIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-8 w-8", className)}
      aria-hidden="true"
      suppressHydrationWarning
    >
      <rect
        width="32"
        height="32"
        rx="8"
        className="fill-slate-900 dark:fill-white"
        suppressHydrationWarning
      />
      <path
        d={ECG_PATH}
        className="stroke-white dark:stroke-slate-900"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        suppressHydrationWarning
      />
    </svg>
  );
}

// No background — inherits text colour from parent via currentColor.
export function DocitaIconMonochrome({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-8 w-8", className)}
      aria-hidden="true"
      suppressHydrationWarning
    >
      <path
        d={ECG_PATH}
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        suppressHydrationWarning
      />
    </svg>
  );
}

// Horizontal lock-up: icon + wordmark.
export function DocitaLogo({
  className,
  iconClassName,
  textClassName,
  showText = true,
}: DocitaLogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <DocitaIcon className={cn("h-8 w-8 shrink-0", iconClassName)} />
      {showText && (
        <span
          className={cn(
            "text-xl font-bold tracking-tight text-foreground",
            textClassName,
          )}
        >
          Docita
        </span>
      )}
    </div>
  );
}

// Vertical lock-up for auth pages, onboarding, and hero sections.
// Defaults to the "Modern Healthcare OS" tagline when none is provided.
export function DocitaLogoFull({
  className,
  iconClassName,
  textClassName,
  tagline = "Modern Healthcare OS",
  taglineClassName,
}: DocitaLogoFullProps) {
  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <DocitaIcon className={cn("h-16 w-16", iconClassName)} />
      <div className="flex flex-col items-center gap-1.5">
        <span
          className={cn(
            "text-3xl font-bold tracking-tight text-foreground",
            textClassName,
          )}
        >
          Docita
        </span>
        {tagline && (
          <span
            className={cn(
              "text-xs font-medium tracking-widest uppercase text-muted-foreground",
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

// Text-only wordmark for footer and minimal contexts.
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
        "text-xl font-bold tracking-tight text-foreground",
        className,
        textClassName,
      )}
    >
      Docita
    </span>
  );
}
