"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  InventoryAddItemDialogUI,
  InventoryItemFormData,
} from "./InventoryAddItemDialogUI";
import { useCreateInventoryItem } from "@/hooks/api/use-inventory";
import { useConstants } from "@/features/_shared/hooks/use-constants";

interface InventoryAddItemDialogContainerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}
const initialFormData: InventoryItemFormData = {
  name: "",
  category: "",
  quantity: "",
  expiryDate: "",
  minStock: "10",
};
export function InventoryAddItemDialogContainer({
  isOpen,
  onClose,
  onSuccess,
}: InventoryAddItemDialogContainerProps) {
  const { data: constants } = useConstants();
  const [formData, setFormData] =
    useState<InventoryItemFormData>(initialFormData);
  const { mutate: createItem, isPending } = useCreateInventoryItem();

  const resetForm = () => setFormData(initialFormData);
  const handleFormChange = (data: Partial<InventoryItemFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.category || !formData.quantity) {
      toast.error("Please fill in all required fields");
      return;
    }

    createItem(
      {
        name: formData.name,
        category: formData.category,
        quantity: parseInt(formData.quantity),
        expiryDate: formData.expiryDate
          ? new Date(formData.expiryDate).toISOString()
          : undefined,
        minQuantity: parseInt(formData.minStock),
      },
      {
        onSuccess: () => {
          toast.success("Item added successfully");
          resetForm();
          onClose();
          onSuccess();
        },
        onError: () => {
          toast.error("Failed to add item");
        },
      },
    );
  };
  const handleClose = () => {
    resetForm();
    onClose();
  };
  return (
    <InventoryAddItemDialogUI
      isOpen={isOpen}
      formData={formData}
      isLoading={isPending}
      onClose={handleClose}
      onFormChange={handleFormChange}
      onSubmit={handleSubmit}
      categories={constants?.inventoryCategories}
    />
  );
}

// Alias for backward compatibility
export { InventoryAddItemDialogContainer as InventoryAddItemDialog };
