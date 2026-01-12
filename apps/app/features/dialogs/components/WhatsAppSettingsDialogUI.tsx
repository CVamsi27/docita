import { CRUDDialog } from "@workspace/ui/components/crud-dialog";
import { Label } from "@workspace/ui/components/label";

export interface WhatsAppSettings {
  appointmentReminders: boolean;
  followUpMessages: boolean;
  birthdayWishes: boolean;
  medicineReminders: boolean;
  labReportNotifications: boolean;
  emergencyAlerts: boolean;
}

export interface WhatsAppSettingsDialogUIProps {
  isOpen: boolean;
  onClose: () => void;
  settings: WhatsAppSettings;
  isLoading: boolean;
  onSettingsChange: (settings: WhatsAppSettings) => void;
  onSave: () => void;
}

const labelMap: Record<string, string> = {
  appointmentReminders: "Appointment Reminders",
  followUpMessages: "Follow-up Messages",
  birthdayWishes: "Birthday Wishes",
  medicineReminders: "Medicine Reminders",
  labReportNotifications: "Lab Report Notifications",
  emergencyAlerts: "Emergency Alerts",
};

export function WhatsAppSettingsDialogUI({
  isOpen,
  onClose,
  settings,
  isLoading,
  onSettingsChange,
  onSave,
}: WhatsAppSettingsDialogUIProps) {
  return (
    <CRUDDialog
      open={isOpen}
      onOpenChange={onClose}
      title="WhatsApp Settings"
      description="Configure how your patients receive WhatsApp messages"
      isLoading={isLoading}
      onSubmit={onSave}
      submitLabel={isLoading ? "Saving..." : "Save Settings"}
    >
      <div className="space-y-4">
        {Object.entries(settings).map(([key, value]) => (
          <div key={key} className="flex items-center justify-between">
            <Label className="font-normal">{labelMap[key] || key}</Label>
            <button
              type="button"
              onClick={() =>
                onSettingsChange({
                  ...settings,
                  [key]: !value,
                })
              }
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                value ? "bg-blue-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  value ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        ))}
      </div>
    </CRUDDialog>
  );
}
