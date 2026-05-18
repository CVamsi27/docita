import { useEffect, useState } from "react";
import {
  ClinicAppSettings,
  useClinicSettings,
  useUpdateClinicSettings,
} from "@workspace/data-access";
import { toast } from "sonner";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";

export interface ReminderSettingsState {
  reminderBefore: string;
  reminderUnit: string;
}

export const useReminderSettingsLogic = () => {
  const { data: clinic, isLoading } = useClinicSettings();
  const { mutate: updateSettingsMutation, isPending: isSaving } =
    useUpdateClinicSettings();

  const [settings, setSettings] = useState<ReminderSettingsState>({
    reminderBefore: "1",
    reminderUnit: "day",
  });

  useEffect(() => {
    if (clinic) {
      const clinicSettings =
        (clinic.settings as ClinicAppSettings) || null;
      setSettings({
        reminderBefore: String(clinicSettings?.reminderBefore || "1"),
        reminderUnit: clinicSettings?.reminderUnit || "day",
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
      },
      {
        onSuccess: () => {
          toast.success("Reminder settings saved successfully");
        },
        onError: (error) => {
          showUserFacingErrorToast(
            error,
            "We could not save your reminder settings. Please try again.",
            "save",
          );
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
