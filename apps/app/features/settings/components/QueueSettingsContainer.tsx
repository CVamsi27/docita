"use client";

import { useEffect, useState } from "react";
import { apiHooks } from "@/lib/api-hooks";
import { toast } from "sonner";
import { QueueSettingsUI } from "./QueueSettingsUI";

export function QueueSettingsContainer() {
  const { data: settings, isLoading, refetch } = apiHooks.useQueueSettings();
  const { mutate: updateSettings, isPending: saving } =
    apiHooks.useUpdateQueueSettings();

  const [queueBufferMinutes, setQueueBufferMinutes] = useState(10);
  const [useDoctorQueues, setUseDoctorQueues] = useState(false);
  const [lateArrivalGraceMinutes, setLateArrivalGraceMinutes] = useState(30);
  const [avgConsultationMinutes, setAvgConsultationMinutes] = useState(15);

  useEffect(() => {
    if (settings) {
      setQueueBufferMinutes(settings.queueBufferMinutes);
      setUseDoctorQueues(settings.useDoctorQueues);
      setLateArrivalGraceMinutes(settings.lateArrivalGraceMinutes);
      setAvgConsultationMinutes(settings.avgConsultationMinutes);
    }
  }, [settings]);

  const handleSave = () => {
    updateSettings(
      {
        queueBufferMinutes,
        useDoctorQueues,
        lateArrivalGraceMinutes,
        avgConsultationMinutes,
      },
      {
        onSuccess: () => {
          toast.success("Queue settings saved");
          refetch();
        },
        onError: () => {
          toast.error("Failed to save queue settings");
        },
      },
    );
  };

  return (
    <QueueSettingsUI
      isLoading={isLoading}
      saving={saving}
      queueBufferMinutes={queueBufferMinutes}
      useDoctorQueues={useDoctorQueues}
      lateArrivalGraceMinutes={lateArrivalGraceMinutes}
      avgConsultationMinutes={avgConsultationMinutes}
      onQueueBufferChange={setQueueBufferMinutes}
      onUseDoctorQueuesChange={setUseDoctorQueues}
      onLateArrivalGraceChange={setLateArrivalGraceMinutes}
      onAvgConsultationChange={setAvgConsultationMinutes}
      onSave={handleSave}
    />
  );
}
