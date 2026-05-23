"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  useClinicSettings,
  useUpdateClinicSettings,
} from "@workspace/data-access";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { Button } from "@workspace/ui/components/form/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { Input } from "@workspace/ui/components/form/input";
import { Switch } from "@workspace/ui/components/form/switch";
import { Skeleton } from "@workspace/ui/components/feedback/skeleton";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@workspace/ui/components/form/form";
import {
  queueSettingsFormSchema,
  type QueueSettingsFormValues,
} from "@workspace/types";

export const QueueConfigurationForm = () => {
  const { data: clinic, isLoading: settingsLoading } = useClinicSettings();
  const { mutate: updateSettings, isPending: isSaving } =
    useUpdateClinicSettings();

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
    <Card>
      <CardHeader>
        <CardTitle>Queue configuration</CardTitle>
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
              <Skeleton className="h-20 w-full rounded-lg" />
              <Skeleton className="h-20 w-full rounded-lg" />
              <Skeleton className="h-20 w-full rounded-lg" />
            </div>
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-md" />
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
                  <DocitaLoadingIndicator
                    variant="inline"
                    decorative
                    className="mr-2"
                  />
                )}
                Save Configuration
              </Button>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
};
