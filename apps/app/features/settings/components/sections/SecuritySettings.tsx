"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card";
import { Label } from "@workspace/ui/components/label";
import { Switch } from "@workspace/ui/components/switch";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";

export function SecuritySettings() {
  const [settings, setSettings] = useState({
    twoFactorAuth: false,
    sessionTimeout: '30',
    ipWhitelist: false,
    auditLogs: true,
  });

  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <CardTitle>Security Settings</CardTitle>
        <CardDescription>Manage security and access controls</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label>Two-Factor Authentication</Label>
            <p className="text-sm text-muted-foreground">Add an extra layer of security</p>
          </div>
          <Switch
            checked={settings.twoFactorAuth}
            onCheckedChange={(checked) => setSettings(s => ({ ...s, twoFactorAuth: checked }))}
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label>Session Timeout (minutes)</Label>
            <p className="text-sm text-muted-foreground">Auto logout after inactivity</p>
          </div>
          <Input
            type="number"
            value={settings.sessionTimeout}
            onChange={(e) => setSettings(s => ({ ...s, sessionTimeout: e.target.value }))}
            className="w-20"
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label>Enable Audit Logs</Label>
            <p className="text-sm text-muted-foreground">Track all user actions</p>
          </div>
          <Switch
            checked={settings.auditLogs}
            onCheckedChange={(checked) => setSettings(s => ({ ...s, auditLogs: checked }))}
          />
        </div>
        <Button className="w-full">Save Security Settings</Button>
      </CardContent>
    </Card>
  );
}
