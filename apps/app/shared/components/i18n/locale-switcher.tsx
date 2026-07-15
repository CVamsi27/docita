"use client";

import { useRouter, usePathname } from "next/navigation";
import { useLocale } from "next-intl";
import { Languages } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import { routing } from "@/i18n/routing";

/**
 * Phase 6.4: locale switcher for the sidebar footer / auth shell.
 *
 * Uses next-intl's `useLocale()` to read the active locale and
 * `useRouter` to push a refresh after setting the NEXT_LOCALE
 * cookie. The next-intl provider re-reads the cookie on each
 * request, so the visible strings update on the next render.
 *
 * The switcher is a minimal two-button toggle (EN / हिंदी) — the
 * existing chrome already has a "More actions" overflow menu in
 * the sidebar footer; this slots in next to the theme toggle.
 */
export function LocaleSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const activeLocale = useLocale();
  const otherLocale =
    activeLocale === routing.defaultLocale
      ? routing.locales.find((l) => l !== routing.defaultLocale) ??
        routing.defaultLocale
      : routing.defaultLocale;

  function handleSwitch(nextLocale: string) {
    if (nextLocale === activeLocale) return;
    // next-intl reads the cookie server-side via getLocale(). Setting
    // it on document.cookie and then refreshing the route re-runs
    // the root layout with the new locale.
    document.cookie = `NEXT_LOCALE=${nextLocale};path=/;max-age=31536000;samesite=lax`;
    router.replace(pathname ?? "/");
    router.refresh();
  }

  const otherLabel = otherLocale === "hi" ? "हिंदी" : "EN";
  const activeLabel = activeLocale === "hi" ? "हिंदी" : "EN";

  return (
    <div className="flex items-center gap-1">
      <Languages
        className="h-3.5 w-3.5 text-muted-foreground"
        aria-hidden="true"
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs"
        aria-pressed={activeLocale === "en"}
        onClick={() => handleSwitch("en")}
      >
        EN
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs"
        aria-pressed={activeLocale === "hi"}
        onClick={() => handleSwitch("hi")}
      >
        {otherLabel}
      </Button>
      <span className="sr-only">Active language: {activeLabel}</span>
    </div>
  );
}
