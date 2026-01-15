"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useCreateWhatsAppBroadcast } from "@/hooks/api/use-whatsapp";
import {
  WhatsAppBroadcastDialogUI,
  WhatsAppBroadcastFormData,
} from "./WhatsAppBroadcastDialogUI";
interface WhatsAppBroadcastDialogContainerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}
const initialFormData: WhatsAppBroadcastFormData = {
  campaignName: "",
  message: "",
  sendToAllPatients: true,
  sendToSpecificPatients: false,
  scheduleTime: "",
};
export function WhatsAppBroadcastDialogContainer({
  isOpen,
  onClose,
  onSuccess,
}: WhatsAppBroadcastDialogContainerProps) {
  const [formData, setFormData] =
    useState<WhatsAppBroadcastFormData>(initialFormData);
  const { mutate: createBroadcast, isPending: isLoading } =
    useCreateWhatsAppBroadcast();

  const resetForm = () => setFormData(initialFormData);
  const handleFormChange = (data: Partial<WhatsAppBroadcastFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.campaignName || !formData.message) {
      toast.error("Campaign name and message are required");
      return;
    }

    createBroadcast(formData, {
      onSuccess: () => {
        toast.success("Campaign created successfully");
        resetForm();
        onClose();
        onSuccess?.();
      },
      onError: (error: Error) => {
        toast.error(error.message || "Failed to create campaign");
      },
    });
  };
  const handleClose = () => {
    resetForm();
    onClose();
  };
  return (
    <WhatsAppBroadcastDialogUI
      isOpen={isOpen}
      formData={formData}
      isLoading={isLoading}
      onClose={handleClose}
      onFormChange={handleFormChange}
      onSubmit={handleSubmit}
    />
  );
}

// Alias for backward compatibility
export { WhatsAppBroadcastDialogContainer as WhatsAppBroadcastDialog };
