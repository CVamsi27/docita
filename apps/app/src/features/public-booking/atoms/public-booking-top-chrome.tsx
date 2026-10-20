"use client";

import { Lock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@workspace/ui/components/form/button";
import { DocitaWordmark } from "@workspace/ui/components/indicators/docita-logo";
import { ThemeToggleWithAppearanceSync } from "@/components/layout/theme-toggle-with-appearance-sync";
import { PUBLIC_BOOKING_MAIN_CONTENT_ID } from "@/features/public-booking/public-booking-constants";
import { cn } from "@workspace/ui/lib/utils";

/** Skip past chrome for keyboard / screen reader users (targets `#public-booking-main`). */
export function PublicBookingSkipLink() {
  const { t } = useTranslation("PublicBooking");

  return (
    <Button
      asChild
      variant="primary"
      className={cn(
        "absolute left-4 z-[60] h-auto rounded-[var(--radius-md)] px-4 py-2.5 text-[length:var(--fs-sm)] font-semibold shadow-md",
        "top-[calc(env(safe-area-inset-top)+0.35rem)] -translate-y-[140%] opacity-0 pointer-events-none",
        "focus-visible:pointer-events-auto focus-visible:translate-y-0 focus-visible:opacity-100",
      )}
    >
      <a href={`#${PUBLIC_BOOKING_MAIN_CONTENT_ID}`}>
        {t("topChrome.skipToContent")}
      </a>
    </Button>
  );
}

/** Sticky logo + theme toggle (replaces the legacy floating toggle). */
export function PublicBookingTopChrome() {
  const { t } = useTranslation("PublicBooking");

  return (
    <header
      role="banner"
      className={cn(
        "sticky top-0 z-30 border-b border-b-border/40 bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:backdrop-blur-sm",
        "pb-1.5 pt-[max(0.625rem,env(safe-area-inset-top))] sm:pb-2",
      )}
      aria-label={t("topChrome.ariaLabel")}
    >
      <div className="mx-auto grid h-9 w-full max-w-6xl grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-3 px-4 sm:px-6">
        <div className="flex min-h-0 min-w-0 items-center leading-none">
          <DocitaWordmark className="block h-[26px] max-h-[26px] w-auto max-w-[min(100%,11rem)] object-contain object-left sm:h-7 sm:max-h-7 sm:max-w-[12.5rem] md:h-8 md:max-h-8" />
        </div>
        <div
          className="hidden items-center gap-1.5 text-[length:var(--fs-2xs)] text-muted-foreground sm:flex"
          aria-hidden
        >
          <Lock className="h-3 w-3 shrink-0" />
          <span>{t("topChrome.privateBooking")}</span>
        </div>
        <div className="flex items-center justify-end">
          <ThemeToggleWithAppearanceSync />
        </div>
      </div>
    </header>
  );
}
