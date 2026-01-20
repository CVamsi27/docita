"use client";

import { FC, useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Label } from "@workspace/ui/components/label";
import { Switch } from "@workspace/ui/components/switch";
import { Input } from "@workspace/ui/components/input";
import { toast } from "sonner";
import { useUpdateQueueSettings } from "@/hooks/api/use-appointments";
import { FeatureGuard } from "@/features/_shared/components/feature-guard";
import { Feature } from "@/lib/stores/permission-store";

interface QueueSettings {
  queueBufferMinutes?: number;
  useDoctorQueues?: boolean;
  lateArrivalGraceMinutes?: number;
  avgConsultationMinutes?: number;
}

interface QueueSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: QueueSettings | null;
  onSettingsUpdated?: () => void;
}

export const QueueSettingsDialog: FC<QueueSettingsDialogProps> = ({
  open,
  onOpenChange,
  settings,
  onSettingsUpdated,
}) => {
  const { mutate: updateSettings, isPending: saving } =
    useUpdateQueueSettings();
  const [queueBuffer, setQueueBuffer] = useState(
    settings?.queueBufferMinutes ?? 10,
  );
  const [useDoctorQueues, setUseDoctorQueues] = useState(
    settings?.useDoctorQueues ?? false,
  );
  const [lateGrace, setLateGrace] = useState(
    settings?.lateArrivalGraceMinutes ?? 30,
  );
  const [avgConsultation, setAvgConsultation] = useState(
    settings?.avgConsultationMinutes ?? 15,
  );

  useEffect(() => {
    if (settings) {
      setQueueBuffer(settings.queueBufferMinutes ?? 10);
      setUseDoctorQueues(settings.useDoctorQueues ?? false);
      setLateGrace(settings.lateArrivalGraceMinutes ?? 30);
      setAvgConsultation(settings.avgConsultationMinutes ?? 15);
    }
  }, [settings]);

  if (!open) return null;

  const handleSave = () => {
    updateSettings(
      {
        queueBufferMinutes: queueBuffer,
        useDoctorQueues,
        lateArrivalGraceMinutes: lateGrace,
        avgConsultationMinutes: avgConsultation,
      },
      {
        onSuccess: () => {
          toast.success("Queue settings saved");
          onSettingsUpdated?.();
          onOpenChange(false);
        },
        onError: (error: Error) => {
          toast.error(error.message || "Failed to save queue settings");
        },
      },
    );
  };

  return (
    <FeatureGuard feature={Feature.QUEUE_MANAGEMENT}>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <Card className="w-full max-w-lg m-4 max-h-[90vh] overflow-y-auto">
          <CardHeader>
            <CardTitle>Queue Settings</CardTitle>
            <CardDescription>Configure queue behavior</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Queue Buffer (minutes)</Label>
              <Input
                type="number"
                min={5}
                max={30}
                value={queueBuffer}
                onChange={(e) => setQueueBuffer(Number(e.target.value))}
              />
              <p className="text-sm text-muted-foreground">
                Patients can check in ±{queueBuffer} min from scheduled time
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>Doctor-Specific Queues</Label>
                <p className="text-sm text-muted-foreground">
                  Separate queue per doctor
                </p>
              </div>
              <Switch
                checked={useDoctorQueues}
                onCheckedChange={setUseDoctorQueues}
              />
            </div>

            <div className="space-y-2">
              <Label>Late Arrival Grace (minutes)</Label>
              <Input
                type="number"
                min={10}
                max={60}
                value={lateGrace}
                onChange={(e) => setLateGrace(Number(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label>Avg Consultation (minutes)</Label>
              <Input
                type="number"
                min={5}
                max={60}
                value={avgConsultation}
                onChange={(e) => setAvgConsultation(Number(e.target.value))}
              />
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </FeatureGuard>
  );
};
