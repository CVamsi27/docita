import { useEffect, useState } from "react";
import { apiHooks } from "@/lib/api-hooks";
import { toast } from "sonner";
import {
  WhatsAppSettingsDialogUI,
  WhatsAppSettings,
} from "./WhatsAppSettingsDialogUI";

interface WhatsAppSettingsDialogContainerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}
export function WhatsAppSettingsDialogContainer({
  isOpen,
  onClose,
  onSuccess,
}: WhatsAppSettingsDialogContainerProps) {
  const {
    data: initialSettings,
    isLoading: loading,
    refetch,
  } = apiHooks.useWhatsAppSettings();
  const { mutate: updateSettings, isPending: isSaving } =
    apiHooks.useUpdateWhatsAppSettings();

  const [settings, setSettings] = useState<WhatsAppSettings>({
    appointmentReminders: true,
    followUpMessages: true,
    birthdayWishes: false,
    medicineReminders: true,
    labReportNotifications: true,
    emergencyAlerts: true,
  });

  useEffect(() => {
    if (initialSettings) {
      setSettings(initialSettings);
    }
  }, [initialSettings]);

  const handleSave = () => {
    updateSettings(settings, {
      onSuccess: () => {
        toast.success("Settings updated successfully");
        onSuccess?.();
        onClose();
        refetch();
      },
      onError: () => {
        toast.error("Failed to update settings");
      },
    });
  };
  return (
    <WhatsAppSettingsDialogUI
      isOpen={isOpen}
      onClose={onClose}
      settings={settings}
      isLoading={loading || isSaving}
      onSettingsChange={setSettings}
      onSave={handleSave}
    />
  );
}

// Alias for backward compatibility
export { WhatsAppSettingsDialogContainer as WhatsAppSettingsDialog };
