import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { CRUDDialog, FormFieldGroup } from "@workspace/ui/components";
import { Input } from "@workspace/ui/components/input";
import { Textarea } from "@workspace/ui/components/textarea";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Label } from "@workspace/ui/components/label";
import { Form, FormControl, FormField } from "@workspace/ui/components/form";
import { requiredStringSchema } from "@/features/_shared/schemas/common.schemas";
import { FeatureGuard } from "@/features/_shared/components/auth/feature-guard";
import { Feature } from "@/lib/stores/permission-store";

const whatsAppBroadcastSchema = z.object({
  campaignName: requiredStringSchema("Campaign Name"),
  message: z
    .string()
    .min(1, "Message is required")
    .max(160, "Message cannot exceed 160 characters"),
  sendToAllPatients: z.boolean(),
  sendToSpecificPatients: z.boolean(),
  scheduleTime: z.string().optional(),
});

type WhatsAppBroadcastFormValues = z.infer<typeof whatsAppBroadcastSchema>;

export type WhatsAppBroadcastFormData = WhatsAppBroadcastFormValues;

export interface WhatsAppBroadcastDialogUIProps {
  isOpen: boolean;
  defaultValues?: Partial<WhatsAppBroadcastFormValues>;
  isLoading: boolean;
  onClose: () => void;
  onSubmit: (data: WhatsAppBroadcastFormValues) => void;
}

export function WhatsAppBroadcastDialogUI({
  isOpen,
  defaultValues,
  isLoading,
  onClose,
  onSubmit,
}: WhatsAppBroadcastDialogUIProps) {
  const form = useForm<WhatsAppBroadcastFormValues>({
    resolver: zodResolver(whatsAppBroadcastSchema),
    defaultValues: {
      campaignName: "",
      message: "",
      sendToAllPatients: false,
      sendToSpecificPatients: false,
      scheduleTime: "",
      ...defaultValues,
    },
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      form.reset({
        campaignName: "",
        message: "",
        sendToAllPatients: true,
        sendToSpecificPatients: false,
        scheduleTime: "",
        ...defaultValues,
      });
    }
  }, [isOpen, defaultValues, form]);

  const handleSubmit = (data: WhatsAppBroadcastFormValues) => {
    onSubmit(data);
  };

  const watchMessage = form.watch("message");
  const watchSendToAll = form.watch("sendToAllPatients");

  return (
    <FeatureGuard feature={Feature.BROADCAST_CAMPAIGNS}>
      <CRUDDialog
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
        title="Create Broadcast Campaign"
        description="Send a message to multiple patients via WhatsApp"
        isLoading={isLoading}
        onSubmit={form.handleSubmit(handleSubmit)}
        submitLabel="Create Campaign"
        contentClassName="max-w-md"
      >
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            noValidate
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="campaignName"
              render={({ field }) => (
                <FormFieldGroup
                  label="Campaign Name"
                  required
                  error={form.formState.errors.campaignName?.message}
                >
                  <FormControl>
                    <Input
                      placeholder="e.g., Monthly Health Reminder"
                      {...field}
                    />
                  </FormControl>
                </FormFieldGroup>
              )}
            />

            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormFieldGroup
                  label="Message"
                  required
                  error={form.formState.errors.message?.message}
                >
                  <div className="space-y-2">
                    <FormControl>
                      <Textarea
                        placeholder="Enter your message..."
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      {(watchMessage || "").length}/160 characters
                    </p>
                  </div>
                </FormFieldGroup>
              )}
            />

            <div className="space-y-2">
              <Label>Recipients</Label>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="sendAll"
                  checked={watchSendToAll}
                  onCheckedChange={(checked) => {
                    form.setValue("sendToAllPatients", !!checked);
                    form.setValue("sendToSpecificPatients", !!checked);
                  }}
                />
                <Label htmlFor="sendAll">Send to all patients</Label>
              </div>
            </div>

            <FormField
              control={form.control}
              name="scheduleTime"
              render={({ field }) => (
                <FormFieldGroup
                  label="Schedule (Optional)"
                  hint="Leave empty to send immediately"
                  error={form.formState.errors.scheduleTime?.message}
                >
                  <FormControl>
                    <Input
                      type="datetime-local"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                </FormFieldGroup>
              )}
            />
          </form>
        </Form>
      </CRUDDialog>
    </FeatureGuard>
  );
}
