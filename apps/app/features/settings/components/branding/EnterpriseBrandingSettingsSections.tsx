"use client";

import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Label } from "@workspace/ui/components/form/label";
import { Input } from "@workspace/ui/components/form/input";
import { Switch } from "@workspace/ui/components/form/switch";
import { Button } from "@workspace/ui/components/form/button";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/form/toggle-group";
import { Badge } from "@workspace/ui/components/indicators/badge";
import { Separator } from "@workspace/ui/components/layout/separator";
import { cn } from "@workspace/ui/lib/utils";

const ACCENT_OPTIONS = [
  { value: "blue", label: "Blue" },
  { value: "green", label: "Green" },
  { value: "purple", label: "Purple" },
  { value: "orange", label: "Orange" },
  { value: "rose", label: "Rose" },
  { value: "teal", label: "Teal" },
  { value: "slate", label: "Slate" },
];

/**
 * Phase 3 (per-feature): apps/app Settings > Enterprise branding
 * (3 enterprise-feature cards). 8 literals converted to
 * useTranslations("Settings.enterpriseBranding").
 */
function useEnterpriseBrandingTranslations() {
  return useTranslations("Settings.enterpriseBranding");
}

interface BrandNameCardProps {
  hasWhiteLabel: boolean;
  brandName: string;
  onBrandNameChange: (value: string) => void;
  isSaving: boolean;
  onSave: () => void;
}

export function BrandNameCard({
  hasWhiteLabel,
  brandName,
  onBrandNameChange,
  isSaving,
  onSave,
}: BrandNameCardProps) {
  const t = useEnterpriseBrandingTranslations();
  return (
    <Card>
      <CardHeader className="border-b border-border/60 pb-5">
        <div className="flex items-center gap-2">
          <CardTitle>{t("brandNameTitle")}</CardTitle>
          {!hasWhiteLabel && (
            <Badge
              variant="outline"
              className="ui-eyebrow border-border/60 text-muted-foreground"
            >
              {t("enterpriseBadge")}
            </Badge>
          )}
        </div>
        <CardDescription>
          {t("brandNameDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 pt-5">
        <div className="flex flex-col gap-2">
          <Label htmlFor="brand-name">{t("displayNameLabel")}</Label>
          <Input
            id="brand-name"
            placeholder={t("displayNamePlaceholder")}
            value={brandName}
            onChange={(e) => onBrandNameChange(e.target.value)}
            maxLength={80}
            disabled={!hasWhiteLabel}
          />
          <p className="text-xs text-muted-foreground">
            {t("displayNameHelper")}
          </p>
        </div>
        <div className="flex justify-end border-t border-border/60 pt-4">
          <Button onClick={onSave} disabled={!hasWhiteLabel || isSaving}>
            {t("saveBrandNameButton")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface LockedThemeCardProps {
  hasLockedTheme: boolean;
  primaryColor: string;
  onPrimaryColorChange: (value: string) => void;
  mode: "light" | "dark" | "system";
  onModeChange: (value: "light" | "dark" | "system") => void;
  compactMode: boolean;
  onCompactModeChange: (value: boolean) => void;
  enforced: boolean;
  onEnforcedChange: (value: boolean) => void;
  isSaving: boolean;
  onSave: () => void;
}

export function LockedThemeCard({
  hasLockedTheme,
  primaryColor,
  onPrimaryColorChange,
  mode,
  onModeChange,
  compactMode,
  onCompactModeChange,
  enforced,
  onEnforcedChange,
  isSaving,
  onSave,
}: LockedThemeCardProps) {
  const t = useEnterpriseBrandingTranslations();
  return (
    <Card>
      <CardHeader className="border-b border-border/60 pb-5">
        <div className="flex items-center gap-2">
          <CardTitle>{t("lockedThemeTitle")}</CardTitle>
          {!hasLockedTheme && (
            <Badge
              variant="outline"
              className="ui-eyebrow border-border/60 text-muted-foreground"
            >
              {t("enterpriseBadge")}
            </Badge>
          )}
        </div>
        <CardDescription>
          {t("lockedThemeDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-6 pt-5">
        <div className="space-y-3">
          <Label>{t("colourAccentLabel")}</Label>
          <ToggleGroup
            type="single"
            value={primaryColor}
            onValueChange={(v) => {
              if (typeof v === "string" && v) onPrimaryColorChange(v);
            }}
            className={cn(
              "flex flex-wrap gap-2 justify-start",
              !hasLockedTheme && "pointer-events-none opacity-50",
            )}
          >
            {ACCENT_OPTIONS.map((opt) => (
              <ToggleGroupItem
                key={opt.value}
                value={opt.value}
                className="h-8 px-3 text-xs data-[state=on]:bg-[color-mix(in_oklch,var(--primary)_12%,transparent)] data-[state=on]:text-primary data-[state=on]:font-semibold"
              >
                {opt.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        <div className="space-y-3">
          <Label>{t("modeLabel")}</Label>
          <ToggleGroup
            type="single"
            value={mode}
            onValueChange={(v) => {
              if (v === "light" || v === "dark" || v === "system") onModeChange(v);
            }}
            className={cn(
              "flex gap-2 justify-start",
              !hasLockedTheme && "pointer-events-none opacity-50",
            )}
          >
            <ToggleGroupItem
              value="light"
              className="h-8 px-3 text-xs data-[state=on]:bg-[color-mix(in_oklch,var(--primary)_12%,transparent)] data-[state=on]:text-primary data-[state=on]:font-semibold"
            >
              {t("modeLight")}
            </ToggleGroupItem>
            <ToggleGroupItem
              value="dark"
              className="h-8 px-3 text-xs data-[state=on]:bg-[color-mix(in_oklch,var(--primary)_12%,transparent)] data-[state=on]:text-primary data-[state=on]:font-semibold"
            >
              {t("modeDark")}
            </ToggleGroupItem>
            <ToggleGroupItem
              value="system"
              className="h-8 px-3 text-xs data-[state=on]:bg-[color-mix(in_oklch,var(--primary)_12%,transparent)] data-[state=on]:text-primary data-[state=on]:font-semibold"
            >
              {t("modeSystem")}
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="compact-mode">{t("compactModeLabel")}</Label>
            <p className="text-xs text-muted-foreground">
              {t("compactModeHelper")}
            </p>
          </div>
          <Switch
            id="compact-mode"
            checked={compactMode}
            onCheckedChange={onCompactModeChange}
            disabled={!hasLockedTheme}
          />
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="enforced-theme">{t("enforceForAllLabel")}</Label>
            <p className="text-xs text-muted-foreground">
              {t("enforceForAllHelper")}
            </p>
          </div>
          <Switch
            id="enforced-theme"
            checked={enforced}
            onCheckedChange={onEnforcedChange}
            disabled={!hasLockedTheme}
          />
        </div>

        <div className="flex justify-end border-t border-border/60 pt-4">
          <Button onClick={onSave} disabled={!hasLockedTheme || isSaving}>
            {t("saveThemeButton")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

interface WhatsAppNumberCardProps {
  hasWhatsAppOwn: boolean;
}

export function WhatsAppNumberCard({
  hasWhatsAppOwn,
}: WhatsAppNumberCardProps) {
  const t = useEnterpriseBrandingTranslations();
  return (
    <Card>
      <CardHeader className="border-b border-border/60 pb-5">
        <div className="flex items-center gap-2">
          <CardTitle>{t("whatsAppTitle")}</CardTitle>
          {!hasWhatsAppOwn && (
            <Badge
              variant="outline"
              className="ui-eyebrow border-border/60 text-muted-foreground"
            >
              {t("professionalPlusBadge")}
            </Badge>
          )}
        </div>
        <CardDescription>
          {t("whatsAppDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-5">
        {hasWhatsAppOwn ? (
          <p className="text-sm text-muted-foreground">
            {t("whatsAppActiveHelper")}{" "}
            <a
              href="/settings/whatsapp-sender"
              className="underline underline-offset-4 hover:text-foreground"
            >
              {t("whatsAppSettingsLink")}
            </a>
            .
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("whatsAppUpgradeHelper")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
