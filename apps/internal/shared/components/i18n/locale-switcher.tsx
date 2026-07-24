"use client";

import { usePathname, useRouter } from "next/navigation";
import { useLocale } from "next-intl";
import { Button } from "@workspace/ui/components/form/button";

/**
 * Phase 6.4: locale switcher for the apps/internal sidebar footer.
 *
 * Mirrors apps/app/shared/components/i18n/locale-switcher.tsx but
 * is rendered as a simple two-button toggle next to the Theme row
 * in the internal sidebar. The cookie is set on the document and
 * the route is refreshed to re-run the root layout's
 * getMessages() call.
 */
export function LocaleSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const activeLocale = useLocale();

  function handleSwitch(nextLocale: string) {
    if (nextLocale === activeLocale) return;
    document.cookie = `NEXT_LOCALE=${nextLocale};path=/;max-age=31536000;samesite=lax`;
    router.replace(pathname ?? "/");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant={activeLocale === "en" ? "default" : "ghost"}
        size="sm"
        className="h-7 px-2 text-xs"
        aria-pressed={activeLocale === "en"}
        onClick={() => handleSwitch("en")}
      >
        EN
      </Button>
      <Button
        type="button"
        variant={activeLocale === "hi" ? "default" : "ghost"}
        size="sm"
        className="h-7 px-2 text-xs"
        aria-pressed={activeLocale === "hi"}
        onClick={() => handleSwitch("hi")}
      >
        हिंदी
      </Button>
    </div>
  );
}
