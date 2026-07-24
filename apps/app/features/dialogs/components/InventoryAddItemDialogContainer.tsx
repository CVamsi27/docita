"use client";

import { toast } from "sonner";
import { InventoryAddItemDialogUI, InventoryItemFormData } from "./InventoryAddItemDialogUI";
import { useCreateInventoryItem } from "@workspace/data-access";
import { useConstants } from "@/hooks/use-constants";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";

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
  const { mutate: createItem, isPending } = useCreateInventoryItem();

  const handleSubmit = (data: InventoryItemFormData) => {
    createItem(
      {
        name: data.name,
        category: data.category,
        quantity: parseInt(data.quantity),
        expiryDate: data.expiryDate
          ? new Date(data.expiryDate).toISOString()
          : undefined,
        minQuantity: data.minStock ? parseInt(data.minStock) : 10,
      },
      {
        onSuccess: () => {
          toast.success("Item added successfully");
          onClose();
          onSuccess();
        },
        onError: () => {
          showUserFacingErrorToast(
            "We could not add this item. Please try again.",
          );
        },
      },
    );
  };

  return (
    <InventoryAddItemDialogUI
      isOpen={isOpen}
      defaultValues={initialFormData}
      isLoading={isPending}
      onClose={onClose}
      onSubmit={handleSubmit}
      categories={constants?.inventoryCategories}
    />
  );
}

export { InventoryAddItemDialogContainer as InventoryAddItemDialog };
