"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Textarea } from "@workspace/ui/components/textarea";
import { Label } from "@workspace/ui/components/label";
import { Checkbox } from "@workspace/ui/components/checkbox";
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

  const handleSubmit = async () => {
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
      setFormData({
        campaignName: "",
        message: "",
        sendToAllPatients: true,
        sendToSpecificPatients: false,
        scheduleTime: "",
      });
      onSuccess?.();
      onClose();
    } catch (error) {
      toast.error("Failed to create campaign");
      console.error("Error creating campaign:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Broadcast Campaign</DialogTitle>
          <DialogDescription>
            Send a message to multiple patients via WhatsApp
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="campaignName">Campaign Name</Label>
            <Input
              id="campaignName"
              value={formData.campaignName}
              onChange={(e) =>
                setFormData({ ...formData, campaignName: e.target.value })
              }
              placeholder="e.g., Monthly Health Reminder"
            />
          </div>

          <div>
            <Label htmlFor="message">Message *</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) =>
                setFormData({ ...formData, message: e.target.value })
              }
              placeholder="Enter your message..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {formData.message.length}/160 characters
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={formData.sendToAllPatients}
                onCheckedChange={() =>
                  setFormData({
                    ...formData,
                    sendToAllPatients: !formData.sendToAllPatients,
                    sendToSpecificPatients: formData.sendToAllPatients,
                  })
                }
              />
              <Label>Send to all patients</Label>
            </div>
          </div>

          <div>
            <Label htmlFor="scheduleTime">Schedule (Optional)</Label>
            <Input
              id="scheduleTime"
              type="datetime-local"
              value={formData.scheduleTime}
              onChange={(e) =>
                setFormData({ ...formData, scheduleTime: e.target.value })
              }
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "Creating..." : "Create Campaign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
