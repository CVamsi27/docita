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
import { Input } from "@workspace/ui/components/input";
import { Loader2 } from "lucide-react";
import {
  ClinicAppSettings,
  useClinicSettings,
  useUpdateClinicSettings,
} from "@/hooks/api/use-settings";
import { toast } from "sonner";

export function SecuritySettings() {
  const { data: clinic, isLoading } = useClinicSettings();
  const { mutate: updateSettings, isPending: isSaving } =
    useUpdateClinicSettings();

  const [settings, setSettings] = useState<ClinicAppSettings>({
    twoFactorAuth: false,
    sessionTimeout: "30",
    auditLogs: true,
  });

  useEffect(() => {
    if (clinic) {
      const s = (clinic.settings as ClinicAppSettings) || {};
      setSettings({
        twoFactorAuth: s.twoFactorAuth ?? false,
        sessionTimeout: String(s.sessionTimeout || "30"),
        auditLogs: s.auditLogs ?? true,
      });
    }
  }, [clinic]);

  const handleSave = () => {
    updateSettings(
      {
        twoFactorAuth: settings.twoFactorAuth,
        sessionTimeout: settings.sessionTimeout,
        auditLogs: settings.auditLogs,
      },
      {
        onSuccess: () => {
          toast.success("Security settings saved successfully");
        },
        onError: (error) => {
          toast.error(`Failed to save settings: ${error.message}`);
        },
      }
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
        <CardTitle>Security Settings</CardTitle>
        <CardDescription>Manage security and access controls</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label>Two-Factor Authentication</Label>
            <p className="text-sm text-muted-foreground">
              Add an extra layer of security
            </p>
          </div>
          <Switch
            checked={settings.twoFactorAuth}
            onCheckedChange={(checked) =>
              setSettings((s) => ({ ...s, twoFactorAuth: checked }))
            }
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label>Session Timeout (minutes)</Label>
            <p className="text-sm text-muted-foreground">
              Auto logout after inactivity
            </p>
          </div>
          <Input
            type="number"
            value={settings.sessionTimeout}
            onChange={(e) =>
              setSettings((s) => ({ ...s, sessionTimeout: e.target.value }))
            }
            className="w-20"
          />
        </div>
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label>Enable Audit Logs</Label>
            <p className="text-sm text-muted-foreground">
              Track all user actions
            </p>
          </div>
          <Switch
            checked={settings.auditLogs}
            onCheckedChange={(checked) =>
              setSettings((s) => ({ ...s, auditLogs: checked }))
            }
          />
        </div>
        <Button className="w-full" onClick={handleSave} disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Security Settings
        </Button>
      </CardContent>
    </Card>
  );
}
