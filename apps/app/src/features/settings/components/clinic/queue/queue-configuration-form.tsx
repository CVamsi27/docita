import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useClinicSettings, useUpdateClinicSettings } from "@workspace/data-access";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { Button, Form, Skeleton } from "@workspace/ui/components";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { queueSettingsFormSchema, type QueueSettingsFormValues } from "@workspace/types";
import { DEFAULT_SLOT_DURATION } from "@workspace/utils";
import { QueueConfigSection } from "./QueueConfigSection";
import { QueueHoursFields } from "./QueueHoursFields";
import { QueueNotificationFields } from "./QueueNotificationFields";

export const QueueConfigurationForm = () => {
  const { data: clinic, isLoading: settingsLoading } = useClinicSettings();
  const { mutate: updateSettings, isPending: isSaving } =
    useUpdateClinicSettings();

  const form = useForm<QueueSettingsFormValues>({
    resolver: zodResolver(queueSettingsFormSchema),
    defaultValues: {
      avgConsultationMinutes: DEFAULT_SLOT_DURATION,
      lateArrivalGraceMinutes: 30,
      queueBufferMinutes: 10,
      useDoctorQueues: false,
    },
  });

  useEffect(() => {
    if (clinic) {
      form.reset({
        avgConsultationMinutes:
          clinic.avgConsultationMinutes ?? DEFAULT_SLOT_DURATION,
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
    <QueueConfigSection>
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
            <QueueHoursFields form={form} />
            <QueueNotificationFields form={form} />

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
    </QueueConfigSection>
  );
};
