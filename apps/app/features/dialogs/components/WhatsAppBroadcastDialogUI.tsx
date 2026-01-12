import { CRUDDialog, FormFieldGroup } from "@workspace/ui/components";
import { Input } from "@workspace/ui/components/input";
import { Textarea } from "@workspace/ui/components/textarea";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Label } from "@workspace/ui/components/label";

export interface WhatsAppBroadcastFormData {
  campaignName: string;
  message: string;
  sendToAllPatients: boolean;
  sendToSpecificPatients: boolean;
  scheduleTime: string;
}

export interface WhatsAppBroadcastDialogUIProps {
  isOpen: boolean;
  formData: WhatsAppBroadcastFormData;
  isLoading: boolean;
  onClose: () => void;
  onFormChange: (data: Partial<WhatsAppBroadcastFormData>) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export function WhatsAppBroadcastDialogUI({
  isOpen,
  formData,
  isLoading,
  onClose,
  onFormChange,
  onSubmit,
}: WhatsAppBroadcastDialogUIProps) {
  return (
    <CRUDDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Create Broadcast Campaign"
      description="Send a message to multiple patients via WhatsApp"
      isLoading={isLoading}
      onSubmit={onSubmit}
      submitLabel="Create Campaign"
      contentClassName="max-w-md"
    >
      <FormFieldGroup
        label="Campaign Name"
        required
        error={formData.campaignName ? undefined : "Campaign name is required"}
      >
        <Input
          id="campaignName"
          value={formData.campaignName}
          onChange={(e) => onFormChange({ campaignName: e.target.value })}
          placeholder="e.g., Monthly Health Reminder"
          required
        />
      </FormFieldGroup>

      <FormFieldGroup
        label="Message"
        required
        error={formData.message ? undefined : "Message is required"}
      >
        <div className="space-y-2">
          <Textarea
            id="message"
            value={formData.message}
            onChange={(e) => onFormChange({ message: e.target.value })}
            placeholder="Enter your message..."
            rows={4}
            required
          />
          <p className="text-xs text-muted-foreground">
            {formData.message.length}/160 characters
          </p>
        </div>
      </FormFieldGroup>

      <div className="space-y-2">
        <Label>Recipients</Label>
        <div className="flex items-center gap-2">
          <Checkbox
            id="sendAll"
            checked={formData.sendToAllPatients}
            onCheckedChange={() =>
              onFormChange({
                sendToAllPatients: !formData.sendToAllPatients,
                sendToSpecificPatients: formData.sendToAllPatients,
              })
            }
          />
          <Label htmlFor="sendAll">Send to all patients</Label>
        </div>
      </div>

      <FormFieldGroup
        label="Schedule (Optional)"
        hint="Leave empty to send immediately"
      >
        <Input
          id="scheduleTime"
          type="datetime-local"
          value={formData.scheduleTime}
          onChange={(e) => onFormChange({ scheduleTime: e.target.value })}
        />
      </FormFieldGroup>
    </CRUDDialog>
  );
}
