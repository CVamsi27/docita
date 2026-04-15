"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueue, useResetQueue } from "@/hooks/api/use-appointments";
import {
  useClinicSettings,
  useUpdateClinicSettings,
} from "@/hooks/api/use-settings";
import { toast } from "sonner";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Switch } from "@workspace/ui/components/switch";
import { Loader2, RefreshCw, RotateCcw } from "lucide-react";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";

export const QueueSettings = () => {
  const { data: queue, isLoading: queueLoading, isRefetching, refetch } = useQueue();
  const { mutate: resetQueue, isPending: isResetting } = useResetQueue();
  const { data: clinic, isLoading: settingsLoading } = useClinicSettings();
  const { mutate: updateSettings, isPending: isSaving } = useUpdateClinicSettings();

  const [avgConsultation, setAvgConsultation] = useState(15);
  const [lateArrivalGrace, setLateArrivalGrace] = useState(30);
  const [queueBuffer, setQueueBuffer] = useState(10);
  const [useDoctorQueues, setUseDoctorQueues] = useState(false);

  useEffect(() => {
    if (clinic) {
      setAvgConsultation(clinic.avgConsultationMinutes ?? 15);
      setLateArrivalGrace(clinic.lateArrivalGraceMinutes ?? 30);
      setQueueBuffer(clinic.queueBufferMinutes ?? 10);
      setUseDoctorQueues(clinic.useDoctorQueues ?? false);
    }
  }, [clinic]);

  const stats = useMemo(() => {
    const items = queue ?? [];
    const waiting = items.filter((item) => item.status === "waiting").length;
    const called = items.filter((item) => item.status === "called").length;
    const completed = items.filter((item) => item.status === "completed").length;
    const avgWait =
      items.length > 0
        ? Math.round(
            items.reduce(
              (total, item) => total + (item.estimatedWaitTime ?? 0),
              0,
            ) / items.length,
          )
        : 0;

    return { total: items.length, waiting, called, completed, avgWait };
  }, [queue]);

  const handleSaveConfig = () => {
    updateSettings(
      {
        avgConsultationMinutes: avgConsultation,
        lateArrivalGraceMinutes: lateArrivalGrace,
        queueBufferMinutes: queueBuffer,
        useDoctorQueues,
      },
      {
        onSuccess: () => {
          toast.success("Queue configuration saved");
        },
        onError: (error) => {
          showUserFacingErrorToast(
            error,
            "We could not save your queue settings. Please try again.",
            "save",
          );
        },
      },
    );
  };

  const handleResetQueue = () => {
    const confirmed = window.confirm(
      "Reset today's queue? This will clear the current queue order",
    );
    if (!confirmed) return;

    resetQueue(undefined, {
      onSuccess: () => {
        toast.success("Queue reset successfully");
        void refetch();
      },
      onError: (error) => {
        showUserFacingErrorToast(
          error,
          "We could not reset today's queue. Please try again.",
          "save",
        );
      },
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Queue Configuration</CardTitle>
          <CardDescription>
            Configure how the patient queue is managed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {settingsLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="avg-consultation">
                    Avg. Consultation (min)
                  </Label>
                  <Input
                    id="avg-consultation"
                    type="number"
                    min={1}
                    max={120}
                    value={avgConsultation}
                    onChange={(e) => setAvgConsultation(Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Used to estimate wait times
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="late-arrival">Late Arrival Grace (min)</Label>
                  <Input
                    id="late-arrival"
                    type="number"
                    min={0}
                    max={120}
                    value={lateArrivalGrace}
                    onChange={(e) => setLateArrivalGrace(Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Allow patients to join queue after this grace period
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="queue-buffer">Queue Buffer (min)</Label>
                  <Input
                    id="queue-buffer"
                    type="number"
                    min={0}
                    max={120}
                    value={queueBuffer}
                    onChange={(e) => setQueueBuffer(Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Extra time added between appointments
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="text-sm font-medium">Use Per-Doctor Queues</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Maintain separate queues for each doctor
                  </p>
                </div>
                <Switch
                  checked={useDoctorQueues}
                  onCheckedChange={setUseDoctorQueues}
                />
              </div>

              <Button
                className="w-full"
                onClick={handleSaveConfig}
                disabled={isSaving}
              >
                {isSaving && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Configuration
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Live Queue Status</CardTitle>
          <CardDescription>
            Monitor and control today&apos;s patient queue.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {queueLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-xl font-semibold">{stats.total}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Waiting</p>
                  <p className="text-xl font-semibold">{stats.waiting}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Called</p>
                  <p className="text-xl font-semibold">{stats.called}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Completed</p>
                  <p className="text-xl font-semibold">{stats.completed}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Avg wait</p>
                  <p className="text-xl font-semibold">{stats.avgWait}m</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">Live queue status</Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void refetch()}
                  disabled={isRefetching}
                >
                  {isRefetching ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Refresh
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleResetQueue}
                  disabled={isResetting || stats.total === 0}
                >
                  {isResetting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCcw className="mr-2 h-4 w-4" />
                  )}
                  Reset Today&apos;s Queue
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Use reset only when queue order needs a hard restart for the day.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
