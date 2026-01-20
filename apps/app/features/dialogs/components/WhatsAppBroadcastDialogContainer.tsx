"use client";

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
  const { mutate: createBroadcast, isPending: isLoading } =
    useCreateWhatsAppBroadcast();

  const handleSubmit = (data: WhatsAppBroadcastFormData) => {
    createBroadcast(data, {
      onSuccess: () => {
        toast.success("Campaign created successfully");
        onClose();
        onSuccess?.();
      },
      onError: (error: Error) => {
        toast.error(error.message || "Failed to create campaign");
      },
    });
  };

  return (
    <WhatsAppBroadcastDialogUI
      isOpen={isOpen}
      defaultValues={initialFormData}
      isLoading={isLoading}
      onClose={onClose}
      onSubmit={handleSubmit}
    />
  );
}

// Alias for backward compatibility
export { WhatsAppBroadcastDialogContainer as WhatsAppBroadcastDialog };
