"use client";

import { toast } from "sonner";
import { useCreateMedicineReminder } from "@/hooks/api/use-whatsapp";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";
import {
  MedicineReminderDialogUI,
  MedicineReminderFormData,
} from "./MedicineReminderDialogUI";

interface MedicineReminderDialogContainerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const initialFormData: MedicineReminderFormData = {
  medicineName: "",
  dosage: "",
  frequency: "once_daily",
  reminderTime: "09:00",
  patientPhone: "",
};

export function MedicineReminderDialogContainer({
  isOpen,
  onClose,
  onSuccess,
}: MedicineReminderDialogContainerProps) {
  const { mutate: createReminder, isPending } = useCreateMedicineReminder();

  const handleSubmit = (data: MedicineReminderFormData) => {
    createReminder(
      {
        ...data,
        patientPhone: data.patientPhone || "",
      },
      {
        onSuccess: () => {
          toast.success("Medicine reminder created successfully");
          onSuccess?.();
          onClose();
        },
        onError: (error: Error) => {
          showUserFacingErrorToast(
            error,
            "We could not create this medicine reminder. Please try again.",
            "save",
          );
        },
      },
    );
  };

  return (
    <MedicineReminderDialogUI
      isOpen={isOpen}
      defaultValues={initialFormData}
      isLoading={isPending}
      onClose={onClose}
      onSubmit={handleSubmit}
    />
  );
}
