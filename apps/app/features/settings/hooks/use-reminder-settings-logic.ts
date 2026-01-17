import { useEffect, useState } from "react";
import {
  useClinicSettings,
  useUpdateClinicSettings,
} from "@/hooks/api/use-settings";
import { toast } from "sonner";

export interface ReminderSettingsState {
  reminderBefore: string;
  reminderUnit: string;
}

// Define exact type for settings to avoid 'any'
interface ClinicSettingsJson {
  reminderBefore?: string;
  reminderUnit?: string;
  [key: string]: unknown;
}

export const useReminderSettingsLogic = () => {
  const { data: clinic, isLoading } = useClinicSettings();
  const { mutate: updateSettingsMutation, isPending: isSaving } =
    useUpdateClinicSettings();

  const [settings, setSettings] = useState<ReminderSettingsState>({
    reminderBefore: "1",
    reminderUnit: "day",
  });

  // Initialize state from fetched data
  useEffect(() => {
    if (clinic) {
      const clinicSettings = (clinic.settings as unknown) as ClinicSettingsJson | null;
      setSettings({
        reminderBefore:
          clinicSettings?.reminderBefore || "1",
        reminderUnit:
          clinicSettings?.reminderUnit || "day",
      });
    }
  }, [clinic]);

  const updateSettings = (updates: Partial<ReminderSettingsState>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  };

  const handleSave = () => {
    // Send flat updates as per ClinicAppSettings interface
    updateSettingsMutation(
      {
        reminderBefore: settings.reminderBefore,
        reminderUnit: settings.reminderUnit,
      },
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

  return {
    settings,
    updateSettings,
    handleSave,
    isLoading,
    isSaving,
  };
};
