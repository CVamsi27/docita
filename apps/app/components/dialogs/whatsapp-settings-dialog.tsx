"use client";

import { useState } from "react";
import { CRUDDialog } from "@workspace/ui/components/crud-dialog";
import { Label } from "@workspace/ui/components/label";
import { toast } from "sonner";

interface WhatsAppSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function WhatsAppSettingsDialog({
  isOpen,
  onClose,
  onSuccess,
}: WhatsAppSettingsDialogProps) {
  const [settings, setSettings] = useState({
    appointmentReminders: true,
    followUpMessages: true,
    birthdayWishes: false,
    medicineReminders: true,
    labReportNotifications: true,
    emergencyAlerts: true,
  });

  const [isLoading, setIsLoading] = useState(false);

  const handleSave = () => {
    setIsLoading(true);
    (async () => {
      try {
        // Call WhatsApp settings API endpoint
        const response = await fetch("/api/whatsapp/settings", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(settings),
        });

        if (!response.ok) throw new Error("Failed to update settings");

        toast.success("Settings updated successfully");
        onSuccess?.();
        onClose();
      } catch (error) {
        toast.error("Failed to update settings");
        console.error("Error updating settings:", error);
      } finally {
        setIsLoading(false);
      }
    })();
  };

  const labelMap: Record<string, string> = {
    appointmentReminders: "Appointment Reminders",
    followUpMessages: "Follow-up Messages",
    birthdayWishes: "Birthday Wishes",
    medicineReminders: "Medicine Reminders",
    labReportNotifications: "Lab Report Notifications",
    emergencyAlerts: "Emergency Alerts",
  };

  return (
    <CRUDDialog
      open={isOpen}
      onOpenChange={onClose}
      title="WhatsApp Settings"
      description="Configure how your patients receive WhatsApp messages"
      isLoading={isLoading}
      onSubmit={handleSave}
      submitLabel={isLoading ? "Saving..." : "Save Settings"}
    >
      <div className="space-y-4">
        {Object.entries(settings).map(([key, value]) => (
          <div key={key} className="flex items-center justify-between">
            <Label className="font-normal">{labelMap[key] || key}</Label>
            <button
              type="button"
              onClick={() =>
                setSettings({
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
