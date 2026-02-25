"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Label } from "@workspace/ui/components/label";
import { Switch } from "@workspace/ui/components/switch";
import { Button } from "@workspace/ui/components/button";
import { Loader2 } from "lucide-react";
import {
  ClinicAppSettings,
  useClinicSettings,
  useUpdateClinicSettings,
} from "@/hooks/api/use-settings";
import { toast } from "sonner";

export function AppearanceSettings() {
  const { data: clinic, isLoading } = useClinicSettings();
  const { mutate: updateSettings, isPending: isSaving } =
    useUpdateClinicSettings();

  const [settings, setSettings] = useState<ClinicAppSettings>({
    theme: "system",
    primaryColor: "blue",
    compactMode: false,
  });

  useEffect(() => {
    if (clinic) {
      const s = (clinic.settings as ClinicAppSettings) || {};
      setSettings({
        theme: s.theme || "system",
        primaryColor: s.primaryColor || "blue",
        compactMode: s.compactMode || false,
      });
    }
  }, [clinic]);

  const handleSave = () => {
    updateSettings(
      {
        theme: settings.theme,
        primaryColor: settings.primaryColor,
        compactMode: settings.compactMode,
      },
      {
        onSuccess: () => {
          toast.success("Appearance settings saved successfully");
        },
        onError: (error) => {
          toast.error(`Failed to save settings: ${error.message}`);
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>Customize the look and feel</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label>Theme</Label>
          <div className="flex gap-2">
            {["light", "dark", "system"].map((t) => (
              <Button
                key={t}
                variant={settings.theme === t ? "default" : "outline"}
                size="sm"
                onClick={() =>
                  setSettings((s) => ({
                    ...s,
                    theme: t as "light" | "dark" | "system",
                  }))
                }
                className="capitalize"
              >
                {t}
              </Button>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <Label>Accent Color</Label>
          <div className="flex gap-2">
            {["blue", "green", "purple", "orange"].map((color) => (
              <button
                key={color}
                className={`h-8 w-8 rounded-full ring-2 ring-offset-2 ring-transparent hover:ring-primary ${settings.primaryColor === color ? "ring-primary" : ""}`}
                onClick={() =>
                  setSettings((s) => ({ ...s, primaryColor: color }))
                }
                style={{
                  backgroundColor:
                    color === "blue"
                      ? "#3b82f6"
                      : color === "green"
                        ? "#22c55e"
                        : color === "purple"
                          ? "#a855f7"
                          : "#f97316",
                }}
              />
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label>Compact Mode</Label>
            <p className="text-sm text-muted-foreground">
              Reduce spacing for more content
            </p>
          </div>
          <Switch
            checked={settings.compactMode}
            onCheckedChange={(checked: boolean) =>
              setSettings((s) => ({ ...s, compactMode: checked }))
            }
          />
        </div>
        <Button className="w-full" onClick={handleSave} disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Appearance
        </Button>
      </CardContent>
    </Card>
  );
}
