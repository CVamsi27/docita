"use client";

import { DocitaLoadingIndicator } from "@workspace/ui/components/docita-loading-indicator";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Switch } from "@workspace/ui/components/switch";
import { RefreshCw, RotateCcw } from "lucide-react";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";
import {
  isQueueTokenCompleted,
  isQueueTokenInProgress,
  isQueueTokenWaiting,
} from "@/lib/queue-token-status";
import { ConfirmationDialog } from "@workspace/ui/components/confirmation-dialog";
import { Skeleton } from "@workspace/ui/components/skeleton";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form";
import {
  queueSettingsFormSchema,
  type QueueSettingsFormValues,
} from "@/features/settings/schemas/queue-settings-form.schema";

export const QueueSettings = () => {
  const { data: queue, isLoading: queueLoading, isRefetching, refetch } =
    useQueue();
  const { mutateAsync: resetQueueAsync, isPending: isResetting } =
    useResetQueue();
  const { data: clinic, isLoading: settingsLoading } = useClinicSettings();
  const { mutate: updateSettings, isPending: isSaving } =
    useUpdateClinicSettings();
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  const form = useForm<QueueSettingsFormValues>({
    resolver: zodResolver(queueSettingsFormSchema),
    defaultValues: {
      avgConsultationMinutes: 15,
      lateArrivalGraceMinutes: 30,
      queueBufferMinutes: 10,
      useDoctorQueues: false,
    },
  });

  useEffect(() => {
    if (clinic) {
      form.reset({
        avgConsultationMinutes: clinic.avgConsultationMinutes ?? 15,
        lateArrivalGraceMinutes: clinic.lateArrivalGraceMinutes ?? 30,
        queueBufferMinutes: clinic.queueBufferMinutes ?? 10,
        useDoctorQueues: clinic.useDoctorQueues ?? false,
      });
    }
  }, [clinic, form]);

  const stats = useMemo(() => {
    const items = queue ?? [];
    const waiting = items.filter((item) =>
      isQueueTokenWaiting(item.status),
    ).length;
    const called = items.filter((item) =>
      isQueueTokenInProgress(item.status),
    ).length;
    const completed = items.filter((item) =>
      isQueueTokenCompleted(item.status),
    ).length;
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

  const onSubmit = (data: QueueSettingsFormValues) => {
    updateSettings(
      {
        avgConsultationMinutes: data.avgConsultationMinutes,
        lateArrivalGraceMinutes: data.lateArrivalGraceMinutes,
        queueBufferMinutes: data.queueBufferMinutes,
        useDoctorQueues: data.useDoctorQueues,
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
            <div
              className="space-y-4"
              role="status"
              aria-live="polite"
              aria-label="Loading queue configuration"
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <Skeleton animation="wave" className="h-20 w-full rounded-lg" />
                <Skeleton animation="wave" className="h-20 w-full rounded-lg" />
                <Skeleton animation="wave" className="h-20 w-full rounded-lg" />
              </div>
              <Skeleton animation="wave" className="h-16 w-full rounded-lg" />
              <Skeleton animation="wave" className="h-10 w-full rounded-md" />
            </div>
          ) : (
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                noValidate
                className="space-y-6"
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="avgConsultationMinutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="avg-consultation">
                          Avg. Consultation (min)
                        </FormLabel>
                        <FormControl>
                          <Input
                            id="avg-consultation"
                            type="number"
                            min={1}
                            max={120}
                            {...field}
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          Used to estimate wait times
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lateArrivalGraceMinutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="late-arrival">
                          Late Arrival Grace (min)
                        </FormLabel>
                        <FormControl>
                          <Input
                            id="late-arrival"
                            type="number"
                            min={0}
                            max={120}
                            {...field}
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          Allow patients to join queue after this grace period
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="queueBufferMinutes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel htmlFor="queue-buffer">
                          Queue Buffer (min)
                        </FormLabel>
                        <FormControl>
                          <Input
                            id="queue-buffer"
                            type="number"
                            min={0}
                            max={120}
                            {...field}
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          Extra time added between appointments
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="useDoctorQueues"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between rounded-lg border p-4">
                        <div>
                          <p className="text-sm font-medium">
                            Use Per-Doctor Queues
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Maintain separate queues for each doctor
                          </p>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button className="w-full" type="submit" disabled={isSaving}>
                  {isSaving && (
                    <DocitaLoadingIndicator variant="inline" decorative className="mr-2" />
                  )}
                  Save Configuration
                </Button>
              </form>
            </Form>
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
            <div
              className="flex flex-col gap-4 py-6"
              role="status"
              aria-live="polite"
              aria-label="Loading queue statistics"
            >
              <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton
                    key={i}
                    animation="wave"
                    className="h-20 rounded-lg"
                  />
                ))}
              </div>
              <Skeleton animation="wave" className="h-10 w-48" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-[var(--fs-xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
                    {stats.total}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Waiting</p>
                  <p className="text-[var(--fs-xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
                    {stats.waiting}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">
                    In consultation
                  </p>
                  <p className="text-[var(--fs-xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
                    {stats.called}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Completed</p>
                  <p className="text-[var(--fs-xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
                    {stats.completed}
                  </p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">Avg wait</p>
                  <p className="text-[var(--fs-xl)] font-semibold tabular-nums leading-[var(--lh-tight)]">
                    {stats.avgWait}m
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">Live queue status</Badge>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={() => void refetch()}
                  disabled={isRefetching}
                >
                  {isRefetching ? (
                    <DocitaLoadingIndicator variant="inline" decorative className="mr-2" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  Refresh
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  type="button"
                  onClick={() => setResetDialogOpen(true)}
                  disabled={isResetting || stats.total === 0}
                >
                  {isResetting ? (
                    <DocitaLoadingIndicator variant="inline" decorative className="mr-2" />
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

      <ConfirmationDialog
        open={resetDialogOpen}
        onOpenChange={setResetDialogOpen}
        title="Reset today's queue?"
        description="This will clear the current queue order for today."
        confirmText="Reset queue"
        type="warning"
        isLoading={isResetting}
        onConfirm={async () => {
          try {
            await resetQueueAsync(undefined);
            toast.success("Queue reset successfully");
            void refetch();
          } catch (error) {
            showUserFacingErrorToast(
              error,
              "We could not reset today's queue. Please try again.",
              "save",
            );
          }
        }}
      />
    </div>
  );
};
