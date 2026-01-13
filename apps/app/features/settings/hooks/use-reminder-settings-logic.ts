import { useState, useEffect } from "react";
import { apiHooks } from "@/lib/api-hooks";
import { toast } from "sonner";

export interface ReminderSettingsState {
  reminderBefore: string;
  reminderUnit: string;
}

export const useReminderSettingsLogic = () => {
  const { data: clinic, isLoading } = apiHooks.useClinicSettings();
  const { mutate: updateSettingsMutation, isPending: isSaving } =
    apiHooks.useUpdateClinicSettings();

  const [settings, setSettings] = useState<ReminderSettingsState>({
    reminderBefore: "1",
    reminderUnit: "day",
  });

  // Initialize state from fetched data
  useEffect(() => {
    if (clinic) {
      setSettings({
        reminderBefore:
          clinic.reminderBefore || clinic.settings?.reminderBefore || "1",
        reminderUnit:
          clinic.reminderUnit || clinic.settings?.reminderUnit || "day",
      });
    }
  }, [clinic]);

  const updateSettings = (updates: Partial<ReminderSettingsState>) => {
    setSettings((prev) => ({ ...prev, ...updates }));
  };

  const handleSave = () => {
    updateSettingsMutation(
      {
        reminderBefore: settings.reminderBefore,
        reminderUnit: settings.reminderUnit,
        settings: {
          ...clinic?.settings,
          reminderBefore: settings.reminderBefore,
          reminderUnit: settings.reminderUnit,
        },
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
