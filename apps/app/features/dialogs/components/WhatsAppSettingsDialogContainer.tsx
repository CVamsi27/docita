import { useEffect, useState } from "react";
import {
  useUpdateWhatsAppSettings,
  useWhatsAppSettings,
} from "@/hooks/api/use-whatsapp";
import { toast } from "sonner";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";
import {
  WhatsAppSettings,
  WhatsAppSettingsDialogUI,
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
  } = useWhatsAppSettings();
  const { mutate: updateSettings, isPending: isSaving } =
    useUpdateWhatsAppSettings();

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
        showUserFacingErrorToast("We could not update settings. Please try again.");
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

export { WhatsAppSettingsDialogContainer as WhatsAppSettingsDialog };
