"use client";

import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { Card } from "@/components/card";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/card";
import { Label } from "@workspace/ui/components/form/label";
import { Switch } from "@workspace/ui/components/form/switch";
import { Button } from "@workspace/ui/components/form/button";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/form/toggle-group";
import { useAppearanceStore } from "@/lib/stores/appearance-store";
import { toast } from "sonner";
import { cn } from "@workspace/ui/lib/utils";

/**
 * Phase 3 (per-feature): apps/app Settings > appearance.
 * 5 literals converted to useTranslations("Settings.Appearance").
 */
function useAppearanceSettingsTranslations() {
  return useTranslations("Settings.Appearance");
}

export function AppearanceSettings() {
  const t = useAppearanceSettingsTranslations();
  const { resolvedTheme } = useTheme();
  const {
    theme,
    primaryColor,
    compactMode,
    setTheme,
    setPrimaryColor,
    setCompactMode,
  } = useAppearanceStore();

  const handleSave = () => {
    toast.success(t("savedToast"));
  };

  const systemHint =
    theme === "system" && resolvedTheme
      ? t("systemHint", { theme: resolvedTheme })
      : null;

  return (
    <Card>
      <CardHeader className="border-b border-border/60 pb-5">
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>
          {t("description")}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6 pt-5">
        <div className="space-y-3">
          <Label>{t("themeLabel")}</Label>
          <div className="flex flex-wrap gap-2">
            {(["light", "dark", "system"] as const).map((opt) => (
              <Button
                key={opt}
                variant={theme === opt ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme(opt)}
                className="capitalize"
              >
                {opt}
              </Button>
            ))}
          </div>
          {systemHint ? (
            <p className="text-xs text-muted-foreground">{systemHint}</p>
          ) : null}
        </div>
        <div className="space-y-3">
          <Label>{t("accentColorLabel")}</Label>
          <ToggleGroup
            aria-label={t("accentColorLabel")}
            type="single"
            value={primaryColor || "blue"}
            onValueChange={(value) => {
              if (typeof value === "string") setPrimaryColor(value);
            }}
            className="flex flex-wrap gap-2"
          >
            {[
              { value: "blue", className: "bg-info" },
              { value: "green", className: "bg-success" },
              { value: "purple", className: "bg-primary" },
              { value: "orange", className: "bg-warning" },
              {
                value: "rose",
                className: "bg-[var(--tag-rose)]",
              },
              {
                value: "teal",
                className: "bg-[var(--tag-teal)]",
              },
              {
                value: "slate",
                className: "bg-[var(--tag-slate)]",
              },
            ].map((color) => (
              <ToggleGroupItem
                key={color.value}
                value={color.value}
                aria-label={t("accentAria", { color: color.value })}
                className={cn(
                  "h-10 w-10 rounded-full border-border/70 bg-background/70 p-0 shadow-sm",
                  "hover:bg-background/80 focus-visible:ring-[3px] focus-visible:ring-ring/30",
                  primaryColor === color.value &&
                    "ring-2 ring-ring/40 ring-offset-2 ring-offset-background",
                )}
              >
                <span
                  aria-hidden
                  className={cn("h-6 w-6 rounded-full", color.className)}
                />
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-[calc(var(--radius)-4px)] border border-border/60 bg-muted/20 px-4 py-3">
          <div>
            <Label htmlFor="compact-mode">{t("compactModeLabel")}</Label>
            <p className="text-sm text-muted-foreground">
              {t("compactModeDescription")}
            </p>
          </div>
          <Switch
            id="compact-mode"
            checked={compactMode}
            onCheckedChange={(checked: boolean) => setCompactMode(checked)}
          />
        </div>

        <div className="flex flex-col gap-3 rounded-[calc(var(--radius)-4px)] border border-border/60 bg-card p-4">
          <span className="ui-eyebrow">{t("livePreviewLabel")}</span>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" type="button">
              {t("previewPrimaryButton")}
            </Button>
            <Button size="sm" variant="outline" type="button">
              {t("previewOutlineButton")}
            </Button>
            <span className="text-xs text-muted-foreground">
              {t("livePreviewHint")}
            </span>
          </div>
        </div>

        <div className="flex justify-end border-t border-border/60 pt-4">
          <Button type="button" onClick={handleSave}>
            {t("saveButton")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
