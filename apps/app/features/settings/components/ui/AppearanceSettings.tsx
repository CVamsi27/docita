"use client";

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
import { ToggleGroup, ToggleGroupItem } from "@workspace/ui/components/toggle-group";
import { useAppearanceStore } from "@/lib/stores/appearance-store";
import { toast } from "sonner";
import { cn } from "@workspace/ui/lib/utils";

export function AppearanceSettings() {
  const { theme, primaryColor, compactMode, setTheme, setPrimaryColor, setCompactMode } =
    useAppearanceStore();

  const handleSave = () => {
    toast.success("Appearance preferences saved");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>Customize the look and feel</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label>Theme</Label>
          <div className="flex gap-2">
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
        </div>
        <div className="space-y-3">
          <Label>Accent Color</Label>
          <ToggleGroup
            type="single"
            value={primaryColor}
            onValueChange={(value) => {
              if (typeof value === "string") setPrimaryColor(value);
            }}
            className="flex gap-2"
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
                  primaryColor === color.value && "ring-2 ring-ring/40 ring-offset-2 ring-offset-background",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "h-6 w-6 rounded-full",
                    color.className,
                  )}
                />
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <div className="flex items-center justify-between">
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
        <Button className="w-full" onClick={handleSave}>
          Save Appearance
        </Button>
      </CardContent>
    </Card>
  );
}
