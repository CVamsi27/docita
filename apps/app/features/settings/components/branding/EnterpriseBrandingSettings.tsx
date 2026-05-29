"use client";

import { useState } from "react";
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
import { useClinic } from "@/lib/contexts/clinic-context";
import { useUpdateClinicSettings } from "@workspace/data-access";
import { Feature } from "@workspace/types";
import { useTierFeatureEnabled } from "@/lib/access-control/use-tier-feature-enabled";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { toast } from "sonner";

const ACCENT_OPTIONS = [
  { value: "blue", label: "Blue" },
  { value: "green", label: "Green" },
  { value: "purple", label: "Purple" },
  { value: "orange", label: "Orange" },
  { value: "rose", label: "Rose" },
  { value: "teal", label: "Teal" },
  { value: "slate", label: "Slate" },
];

export function EnterpriseBrandingSettings() {
  const { clinic, refreshClinic } = useClinic();
  const hasWhiteLabel = useTierFeatureEnabled(Feature.WHITE_LABEL_BRANDING);
  const hasLockedTheme = useTierFeatureEnabled(Feature.LOCKED_CUSTOM_THEME);
  const hasWhatsAppOwn = useTierFeatureEnabled(Feature.WHATSAPP_OWN_NUMBER);
  const { mutate: updateSettings, isPending: isSaving } =
    useUpdateClinicSettings();

  const existing = clinic?.enterpriseBranding;

  const [brandName, setBrandName] = useState(existing?.brandName ?? "");
  const [primaryColor, setPrimaryColor] = useState(
    existing?.lockedTheme?.primaryColor ?? "blue",
  );
  const [mode, setMode] = useState<"light" | "dark" | "system">(
    existing?.lockedTheme?.mode ?? "system",
  );
  const [compactMode, setCompactMode] = useState(
    existing?.lockedTheme?.compactMode ?? false,
  );
  const [enforced, setEnforced] = useState(
    existing?.lockedTheme?.enforced ?? false,
  );

  const handleSaveBranding = () => {
    updateSettings(
      { brandName: brandName.trim() || undefined },
      {
        onSuccess: async () => {
          await refreshClinic();
          toast.success("Brand name updated");
        },
        onError: (error) =>
          showUserFacingErrorToast(
            error,
            "We could not save the brand name. Please try again.",
            "save",
          ),
      },
    );
  };

  const handleSaveTheme = () => {
    updateSettings(
      {
        lockedTheme: { primaryColor, mode, compactMode, enforced },
      },
      {
        onSuccess: async () => {
          await refreshClinic();
          toast.success("Theme settings saved");
        },
        onError: (error) =>
          showUserFacingErrorToast(
            error,
            "We could not save the theme settings. Please try again.",
            "save",
          ),
      },
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {/* White-label name */}
      <Card>
        <CardHeader className="border-b border-border/60 pb-5">
          <div className="flex items-center gap-2">
            <CardTitle>Brand name</CardTitle>
            {!hasWhiteLabel && (
              <Badge variant="outline" className="ui-eyebrow border-border/60 text-muted-foreground">
                Enterprise
              </Badge>
            )}
          </div>
          <CardDescription>
            Replace &ldquo;Docita&rdquo; with your clinic&apos;s name throughout
            the app.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5 pt-5">
          <div className="flex flex-col gap-2">
            <Label htmlFor="brand-name">Display name</Label>
            <Input
              id="brand-name"
              placeholder="e.g. City Clinic"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              maxLength={80}
              disabled={!hasWhiteLabel}
            />
            <p className="text-xs text-muted-foreground">
              Shown in the sidebar header and browser tab title. Leave blank to
              use &ldquo;Docita&rdquo;.
            </p>
          </div>
          <div className="flex justify-end border-t border-border/60 pt-4">
            <Button
              onClick={handleSaveBranding}
              disabled={!hasWhiteLabel || isSaving}
            >
              Save brand name
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Locked theme */}
      <Card>
        <CardHeader className="border-b border-border/60 pb-5">
          <div className="flex items-center gap-2">
            <CardTitle>Locked theme</CardTitle>
            {!hasLockedTheme && (
              <Badge variant="outline" className="ui-eyebrow border-border/60 text-muted-foreground">
                Enterprise
              </Badge>
            )}
          </div>
          <CardDescription>
            Set a colour scheme and layout that applies to every user in your
            workspace. When enforced, individual appearance preferences are
            overridden.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6 pt-5">
          <div className="space-y-3">
            <Label>Colour accent</Label>
            <ToggleGroup
              type="single"
              value={primaryColor}
              onValueChange={(v) => { if (typeof v === "string" && v) setPrimaryColor(v); }}
              className={cn("flex flex-wrap gap-2 justify-start", !hasLockedTheme && "pointer-events-none opacity-50")}
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
            <Label>Mode</Label>
            <ToggleGroup
              type="single"
              value={mode}
              onValueChange={(v) => {
                if (v === "light" || v === "dark" || v === "system") setMode(v);
              }}
              className={cn("flex gap-2 justify-start", !hasLockedTheme && "pointer-events-none opacity-50")}
            >
              <ToggleGroupItem
                value="light"
                className="h-8 px-3 text-xs data-[state=on]:bg-[color-mix(in_oklch,var(--primary)_12%,transparent)] data-[state=on]:text-primary data-[state=on]:font-semibold"
              >
                Light
              </ToggleGroupItem>
              <ToggleGroupItem
                value="dark"
                className="h-8 px-3 text-xs data-[state=on]:bg-[color-mix(in_oklch,var(--primary)_12%,transparent)] data-[state=on]:text-primary data-[state=on]:font-semibold"
              >
                Dark
              </ToggleGroupItem>
              <ToggleGroupItem
                value="system"
                className="h-8 px-3 text-xs data-[state=on]:bg-[color-mix(in_oklch,var(--primary)_12%,transparent)] data-[state=on]:text-primary data-[state=on]:font-semibold"
              >
                System
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="compact-mode">Compact mode</Label>
              <p className="text-xs text-muted-foreground">
                Reduce spacing for a denser layout
              </p>
            </div>
            <Switch
              id="compact-mode"
              checked={compactMode}
              onCheckedChange={setCompactMode}
              disabled={!hasLockedTheme}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="enforced-theme">Enforce for all users</Label>
              <p className="text-xs text-muted-foreground">
                Override individual appearance preferences across the workspace
              </p>
            </div>
            <Switch
              id="enforced-theme"
              checked={enforced}
              onCheckedChange={setEnforced}
              disabled={!hasLockedTheme}
            />
          </div>

          <div className="flex justify-end border-t border-border/60 pt-4">
            <Button
              onClick={handleSaveTheme}
              disabled={!hasLockedTheme || isSaving}
            >
              Save theme
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* WhatsApp custom number */}
      <Card>
        <CardHeader className="border-b border-border/60 pb-5">
          <div className="flex items-center gap-2">
            <CardTitle>WhatsApp custom number</CardTitle>
            {!hasWhatsAppOwn && (
              <Badge variant="outline" className="ui-eyebrow border-border/60 text-muted-foreground">
                Professional+
              </Badge>
            )}
          </div>
          <CardDescription>
            Send messages from your clinic&apos;s own WhatsApp number instead of
            the shared Docita sender.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-5">
          {hasWhatsAppOwn ? (
            <p className="text-sm text-muted-foreground">
              Configure your WhatsApp sender number in{" "}
              <a
                href="/settings/whatsapp-sender"
                className="underline underline-offset-4 hover:text-foreground"
              >
                WhatsApp settings
              </a>
              .
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              Available on Professional and above. Upgrade your plan to connect
              your own number.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
