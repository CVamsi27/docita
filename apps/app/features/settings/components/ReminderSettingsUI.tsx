import { FC, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Clock, Loader2 } from "lucide-react";
import {
  useClinicSettings,
  useUpdateClinicSettings,
} from "@/hooks/api/use-settings";
import { toast } from "sonner";

export const ReminderSettingsUI: FC = () => {
  const { data: clinic, isLoading } = useClinicSettings();
  const { mutate: updateSettings, isPending: isSaving } =
    useUpdateClinicSettings();

  const [reminderBefore, setReminderBefore] = useState("1");
  const [reminderUnit, setReminderUnit] = useState("day");

  useEffect(() => {
    if (clinic) {
      const settings =
        (clinic.settings as {
          reminderBefore?: string | number;
          reminderUnit?: string;
        }) || {};
      const clinicWithReminders = clinic as {
        reminderBefore?: string | number;
        reminderUnit?: string;
      };

      const before =
        settings.reminderBefore || clinicWithReminders.reminderBefore || "1";
      const unit =
        settings.reminderUnit || clinicWithReminders.reminderUnit || "day";

      setReminderBefore(String(before));
      setReminderUnit(String(unit));
    }
  }, [clinic]);

  const handleSave = () => {
    updateSettings(
      {
        reminderBefore: reminderBefore,
        reminderUnit: reminderUnit,
      } as { reminderBefore: string; reminderUnit: string },
      {
        onSuccess: () => {
          toast.success("Reminder settings saved successfully");
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
    <div className="space-y-6">
      <Card className="border-none shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-purple-600" />
            <div>
              <CardTitle>Reminder Settings</CardTitle>
              <CardDescription>
                Configure appointment reminder timing
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Send reminder before appointment</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                value={reminderBefore}
                onChange={(e) => setReminderBefore(e.target.value)}
                className="w-20"
                min={1}
              />
              <select
                className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={reminderUnit}
                onChange={(e) => setReminderUnit(e.target.value)}
              >
                <option value="minute">Minutes</option>
                <option value="hour">Hours</option>
                <option value="day">Days</option>
                <option value="week">Weeks</option>
              </select>
            </div>
          </div>
          <Button className="w-full" onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
