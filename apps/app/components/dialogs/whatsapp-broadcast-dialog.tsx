"use client";

import { useState } from "react";
import { CRUDDialog, FormFieldGroup } from "@workspace/ui/components";
import { Input } from "@workspace/ui/components/input";
import { Textarea } from "@workspace/ui/components/textarea";
import { Checkbox } from "@workspace/ui/components/checkbox";
import { Label } from "@workspace/ui/components/label";
import { toast } from "sonner";

interface WhatsAppBroadcastDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function WhatsAppBroadcastDialog({
  isOpen,
  onClose,
  onSuccess,
}: WhatsAppBroadcastDialogProps) {
  const [formData, setFormData] = useState({
    campaignName: "",
    message: "",
    sendToAllPatients: true,
    sendToSpecificPatients: false,
    scheduleTime: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  const resetForm = () => {
    setFormData({
      campaignName: "",
      message: "",
      sendToAllPatients: true,
      sendToSpecificPatients: false,
      scheduleTime: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.campaignName || !formData.message) {
      toast.error("Campaign name and message are required");
      return;
    }

    setIsLoading(true);
    try {
      // Call WhatsApp broadcast API endpoint
      const response = await fetch("/api/whatsapp/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error("Failed to create campaign");

      toast.success("Campaign created successfully");
      resetForm();
      onClose();
      onSuccess?.();
    } catch (error) {
      toast.error("Failed to create campaign");
      console.error("Error creating campaign:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <CRUDDialog
      open={isOpen}
      onOpenChange={(open) => {
        onClose();
        if (!open) resetForm();
      }}
      title="Create Broadcast Campaign"
      description="Send a message to multiple patients via WhatsApp"
      isLoading={isLoading}
      onSubmit={handleSubmit}
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
          onChange={(e) =>
            setFormData({ ...formData, campaignName: e.target.value })
          }
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
            onChange={(e) =>
              setFormData({ ...formData, message: e.target.value })
            }
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
              setFormData({
                ...formData,
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
          onChange={(e) =>
            setFormData({ ...formData, scheduleTime: e.target.value })
          }
        />
      </FormFieldGroup>
    </CRUDDialog>
  );
}
