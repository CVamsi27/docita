"use client";

import { useTheme } from "next-themes";
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
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@workspace/ui/components/toggle-group";
import { useAppearanceStore } from "@/lib/stores/appearance-store";
import { toast } from "sonner";
import { cn } from "@workspace/ui/lib/utils";

export function AppearanceSettings() {
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
    toast.success("Appearance preferences saved");
  };

  const systemHint =
    theme === "system" && resolvedTheme
      ? `Active appearance: ${resolvedTheme}`
      : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>Customize the look and feel</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label>Theme</Label>
          <div className="flex flex-wrap gap-2">
            {(["light", "dark", "system"] as const).map((t) => (
              <Button
                key={t}
                variant={theme === t ? "default" : "outline"}
                size="sm"
                onClick={() => setTheme(t)}
                className="capitalize"
              >
                {t}
              </Button>
            ))}
          </div>
          {systemHint ? (
            <p className="text-xs text-muted-foreground">{systemHint}</p>
          ) : null}
        </div>
        <div className="space-y-3">
          <Label>Accent Color</Label>
          <ToggleGroup
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
            ].map((color) => (
              <ToggleGroupItem
                key={color.value}
                value={color.value}
                aria-label={`Select ${color.value} accent color`}
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
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label>Compact Mode</Label>
            <p className="text-sm text-muted-foreground">
              Reduce spacing for more content
            </p>
          </div>
          <Switch
            checked={compactMode}
            onCheckedChange={(checked: boolean) => setCompactMode(checked)}
          />
        </div>

        <div className="rounded-lg border bg-card p-4 space-y-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Live preview
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" type="button">
              Primary
            </Button>
            <Button size="sm" variant="outline" type="button">
              Outline
            </Button>
            <span className="text-xs text-muted-foreground">
              Uses current theme, accent, and density
            </span>
          </div>
        </div>

        <Button className="w-full" type="button" onClick={handleSave}>
          Save Appearance
        </Button>
      </CardContent>
    </Card>
  );
}
