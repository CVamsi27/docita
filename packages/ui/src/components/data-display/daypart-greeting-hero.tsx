import { useEffect, useState } from "react";
import { cn } from "@workspace/ui/lib/utils";

export type Daypart = "morning" | "afternoon" | "evening";

/**
 * Maps a local hour (0-23) to the daypart used by the auth hero greeting.
 * Morning runs until 11:59, afternoon from noon to 16:59, evening from 17:00.
 */
export function getDaypartFromHour(hour: number): Daypart {
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

export interface DaypartGreetingHeroProps {
  /** Localized daypart greeting strings for the active locale. */
  greetings: Record<Daypart, string>;
  /** Localized clock eyebrow label (e.g. "Today" / "आज"). */
  eyebrow: string;
  /** Optional localized supporting description under the greeting. */
  description?: string;
  /** BCP-47 locale used by the live clock (e.g. "en-IN" / "hi-IN"). */
  timeLocale?: string;
  /** Horizontal alignment; centered for single-column auth surfaces. */
  align?: "left" | "center";
  className?: string;
}

/**
 * The bilingual serif front-door signature shared by the clinician app and the
 * internal admin app. Renders a live-clock eyebrow and a daypart-dependent
 * serif greeting; the caller supplies already-localized strings so the
 * primitive stays locale-agnostic (the clinician app wires react-i18next,
 * the internal app passes its own bilingual copy).
 */
export function DaypartGreetingHero({
  greetings,
  eyebrow,
  description,
  timeLocale = "en-IN",
  align = "left",
  className,
}: DaypartGreetingHeroProps) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const daypart = getDaypartFromHour(now.getHours());
  const greeting = greetings[daypart];
  const timeLabel = new Intl.DateTimeFormat(timeLocale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(now);

  return (
    <div
      className={cn(
        "max-w-xl space-y-4",
        align === "center" && "text-center",
        className,
      )}
    >
      <p
        className={cn(
          "flex items-center gap-2 text-[var(--fs-2xs)] font-semibold uppercase tracking-[0.12em] text-muted-foreground",
          align === "center" && "justify-center",
        )}
      >
        <span>{eyebrow}</span>
        <span aria-hidden="true" className="opacity-60">
          ·
        </span>
        <span className="tabular-nums">{timeLabel}</span>
      </p>
      <h2 className="font-serif text-[var(--fs-3xl)] font-semibold leading-[var(--lh-tight)] tracking-tight text-foreground xl:text-[var(--fs-4xl)]">
        {greeting}
      </h2>
      {description ? (
        <p className={cn("ui-page-subtitle max-w-md", align === "center" && "mx-auto")}>
          {description}
        </p>
      ) : null}
    </div>
  );
}
