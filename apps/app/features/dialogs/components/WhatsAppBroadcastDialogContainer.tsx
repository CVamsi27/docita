"use client";

import { toast } from "sonner";
import { useCreateWhatsAppBroadcast } from "@/hooks/api/use-whatsapp";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";
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
        showUserFacingErrorToast(
          error,
          "We could not create this message campaign. Please try again.",
          "save",
        );
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

export { WhatsAppBroadcastDialogContainer as WhatsAppBroadcastDialog };
