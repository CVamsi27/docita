"use client";

import { Button } from "@workspace/ui/components/button";
import { useI18n } from "@/lib/i18n/provider";

export function LanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div className="flex items-center gap-1 rounded-md border bg-background p-1 text-xs">
      <span className="px-2 text-muted-foreground">{t("language")}</span>
      <Button
        type="button"
        variant={locale === "en" ? "default" : "ghost"}
        size="sm"
        className="h-7 px-2"
        onClick={() => setLocale("en")}
      >
        EN
      </Button>
      <Button
        type="button"
        variant={locale === "hi" ? "default" : "ghost"}
        size="sm"
        className="h-7 px-2"
        onClick={() => setLocale("hi")}
      >
        हिंदी
      </Button>
    </div>
  );
}
