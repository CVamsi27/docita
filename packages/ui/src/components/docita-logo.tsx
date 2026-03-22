import { cn } from "@workspace/ui/lib/utils";

// ECG / heartbeat waveform path — center baseline at y=16.
// P wave (small bump), QRS complex (dominant spike), T wave (medium bump).
// Round caps + joins so every vertex reads as a smooth node.
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

// Rounded-square icon.
// Gradient: indigo → cyan  (Medical Cloud)
// White ECG waveform       (Heartbeat Line)
// Round joints at every vertex (Abstract Cross Node feel)
export function DocitaIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-8 w-8", className)}
    >
      <rect width="32" height="32" rx="8" fill="url(#docita_ecg_g)" />
      <path
        d={ECG_PATH}
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient
          id="docita_ecg_g"
          x1="0"
          y1="0"
          x2="32"
          y2="32"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#4F46E5" />
          <stop offset="1" stopColor="#06B6D4" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// No background — inherits text colour from parent.
export function DocitaIconMonochrome({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("h-8 w-8", className)}
    >
      <path
        d={ECG_PATH}
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
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
          className={cn("text-xl font-semibold tracking-tight", textClassName)}
        >
          Docita
        </span>
      )}
    </div>
  );
}

// Vertical lock-up for auth pages, onboarding, and hero sections.
export function DocitaLogoFull({
  className,
  iconClassName,
  textClassName,
  tagline,
  taglineClassName,
}: DocitaLogoFullProps) {
  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      <DocitaIcon className={cn("h-16 w-16", iconClassName)} />
      <div className="flex flex-col items-center gap-1.5">
        <span
          className={cn(
            "text-3xl font-semibold tracking-tight",
            textClassName,
          )}
        >
          Docita
        </span>
        {tagline && (
          <span
            className={cn("text-sm text-muted-foreground", taglineClassName)}
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
        "text-xl font-semibold tracking-tight text-foreground",
        className,
        textClassName,
      )}
    >
      Docita
    </span>
  );
}
