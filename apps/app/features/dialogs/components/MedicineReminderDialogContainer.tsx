"use client";

import { useState } from "react";
import { toast } from "sonner";
import { apiHooks } from "@/lib/api-hooks";
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
  const [formData, setFormData] =
    useState<MedicineReminderFormData>(initialFormData);
  const { mutate: createReminder, isPending } = apiHooks.useCreateMedicineReminder();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    if (!formData.medicineName || !formData.dosage || !formData.reminderTime) {
      toast.error("Please fill in all required fields");
      return;
    }

    createReminder(formData, {
      onSuccess: () => {
        toast.success("Medicine reminder created successfully");
        setFormData(initialFormData);
        onSuccess?.();
        onClose();
      },
      onError: (error: Error) => {
        toast.error(error.message || "Failed to create reminder");
      }
    });
  };

  return (
    <MedicineReminderDialogUI
      isOpen={isOpen}
      formData={formData}
      isLoading={isPending}
      onClose={onClose}
      onInputChange={handleInputChange}
      onSelectChange={handleSelectChange}
      onSubmit={handleSubmit}
    />
  );
}
