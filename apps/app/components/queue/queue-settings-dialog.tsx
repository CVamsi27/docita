"use client";

import { useState, useEffect } from "react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { toast } from "sonner";
import { apiHooks } from "@/lib/api-hooks";

interface QueueSettings {
  queueBufferMinutes?: number;
  lateArrivalGraceMinutes?: number;
  avgConsultationMinutes?: number;
  useDoctorQueues?: boolean;
}

interface QueueSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: QueueSettings | null;
  onSettingsUpdated: () => void;
}

export function QueueSettingsDialog({
  open,
  onOpenChange,
  settings,
  onSettingsUpdated,
}: QueueSettingsDialogProps) {
  const updateSettings = apiHooks.useUpdateQueueSettings();
  const [settingsForm, setSettingsForm] = useState({
    queueBufferMinutes: 10,
    lateArrivalGraceMinutes: 30,
    avgConsultationMinutes: 15,
    useDoctorQueues: false,
  });

  useEffect(() => {
    if (settings) {
      setSettingsForm({
        queueBufferMinutes: settings.queueBufferMinutes || 10,
        lateArrivalGraceMinutes: settings.lateArrivalGraceMinutes || 30,
        avgConsultationMinutes: settings.avgConsultationMinutes || 15,
        useDoctorQueues: settings.useDoctorQueues || false,
      });
    }
  }, [settings]);

  const handleSaveSettings = async () => {
    try {
      await updateSettings.mutateAsync(settingsForm);
      toast.success("Queue settings saved");
      onOpenChange(false);
      onSettingsUpdated();
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast.error("Failed to save settings");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Queue Settings</DialogTitle>
          <DialogDescription>
            Configure queue management settings for your clinic.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 items-center gap-4">
            <Label
              htmlFor="avgConsultationMinutes"
              className="text-right text-sm"
            >
              Avg Consultation (min)
            </Label>
            <Input
              id="avgConsultationMinutes"
              type="number"
              value={settingsForm.avgConsultationMinutes}
              onChange={(e) =>
                setSettingsForm({
                  ...settingsForm,
                  avgConsultationMinutes: parseInt(e.target.value) || 15,
                })
              }
              className="h-9"
            />
          </div>
          <div className="grid grid-cols-2 items-center gap-4">
            <Label htmlFor="queueBufferMinutes" className="text-right text-sm">
              Queue Buffer (min)
            </Label>
            <Input
              id="queueBufferMinutes"
              type="number"
              value={settingsForm.queueBufferMinutes}
              onChange={(e) =>
                setSettingsForm({
                  ...settingsForm,
                  queueBufferMinutes: parseInt(e.target.value) || 10,
                })
              }
              className="h-9"
            />
          </div>
          <div className="grid grid-cols-2 items-center gap-4">
            <Label
              htmlFor="lateArrivalGraceMinutes"
              className="text-right text-sm"
            >
              Late Grace Period (min)
            </Label>
            <Input
              id="lateArrivalGraceMinutes"
              type="number"
              value={settingsForm.lateArrivalGraceMinutes}
              onChange={(e) =>
                setSettingsForm({
                  ...settingsForm,
                  lateArrivalGraceMinutes: parseInt(e.target.value) || 30,
                })
              }
              className="h-9"
            />
          </div>
          <div className="grid grid-cols-2 items-center gap-4">
            <Label htmlFor="useDoctorQueues" className="text-right text-sm">
              Doctor-specific Queues
            </Label>
            <Button
              id="useDoctorQueues"
              variant={settingsForm.useDoctorQueues ? "default" : "outline"}
              size="sm"
              onClick={() =>
                setSettingsForm({
                  ...settingsForm,
                  useDoctorQueues: !settingsForm.useDoctorQueues,
                })
              }
              className="h-9"
            >
              {settingsForm.useDoctorQueues ? "Enabled" : "Disabled"}
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSaveSettings}
            disabled={updateSettings.isPending}
          >
            {updateSettings.isPending ? "Saving..." : "Save Settings"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
