import { Languages } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import { cn } from "@workspace/ui/lib/utils";

export type LocaleToggleValue = "en" | "hi";

export interface LocaleToggleProps {
  /** Active locale. */
  locale: LocaleToggleValue;
  /** Called when the user picks the other locale. */
  onLocaleChange: (locale: LocaleToggleValue) => void;
  className?: string;
}

/**
 * Minimal two-button language toggle (EN / हिंदी). Locale-agnostic: the
 * caller owns persistence and i18n wiring (react-i18next in the clinician
 * app, local state in the internal admin app). Mirrors the shared theme
 * toggle's ghost-button pattern with `aria-pressed` for the active locale.
 */
export function LocaleToggle({
  locale,
  onLocaleChange,
  className,
}: LocaleToggleProps) {
  const activeLabel = locale === "hi" ? "हिंदी" : "EN";

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <Languages
        className="h-3.5 w-3.5 text-muted-foreground"
        aria-hidden="true"
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs"
        aria-pressed={locale === "en"}
        onClick={() => onLocaleChange("en")}
      >
        EN
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs"
        aria-pressed={locale === "hi"}
        onClick={() => onLocaleChange("hi")}
      >
        हिंदी
      </Button>
      <span className="sr-only">Active language: {activeLabel}</span>
    </div>
  );
}
