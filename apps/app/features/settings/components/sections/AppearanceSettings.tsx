"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Label } from "@workspace/ui/components/label";
import { Switch } from "@workspace/ui/components/switch";
import { Button } from "@workspace/ui/components/button";

export function AppearanceSettings() {
  const [theme, setTheme] = useState('system');

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
            {['light', 'dark', 'system'].map((t) => (
              <Button
                key={t}
                variant={theme === t ? 'default' : 'outline'}
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
          <div className="flex gap-2">
            {['blue', 'green', 'purple', 'orange'].map((color) => (
              <button
                key={color}
                className={`h-8 w-8 rounded-full bg-${color}-500 ring-2 ring-offset-2 ring-transparent hover:ring-primary`}
                style={{ backgroundColor: color === 'blue' ? '#3b82f6' : color === 'green' ? '#22c55e' : color === 'purple' ? '#a855f7' : '#f97316' }}
              />
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <Label>Compact Mode</Label>
            <p className="text-sm text-muted-foreground">Reduce spacing for more content</p>
          </div>
          <Switch />
        </div>
        <Button className="w-full">Save Appearance</Button>
      </CardContent>
    </Card>
  );
}
