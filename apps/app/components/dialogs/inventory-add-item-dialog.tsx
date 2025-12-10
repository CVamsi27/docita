"use client";

import { useState } from "react";
import {
  CRUDDialog,
  FormFieldGroup,
} from "@workspace/ui/components";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Input } from "@workspace/ui/components/input";
import { toast } from "sonner";

interface InventoryAddItemDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function InventoryAddItemDialog({
  isOpen,
  onClose,
  onSuccess,
}: InventoryAddItemDialogProps) {
  const [formData, setFormData] = useState({
    name: "",
    category: "",
    quantity: "",
    expiryDate: "",
    minStock: "10",
  });

  const [isPending, setIsPending] = useState(false);

  const resetForm = () => {
    setFormData({
      name: "",
      category: "",
      quantity: "",
      expiryDate: "",
      minStock: "10",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.category || !formData.quantity) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsPending(true);
    try {
      // API call to create inventory item
      const response = await fetch("/api/inventory/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          category: formData.category,
          quantity: parseInt(formData.quantity),
          expiryDate: formData.expiryDate
            ? new Date(formData.expiryDate)
            : undefined,
          minStock: parseInt(formData.minStock),
        }),
      });

      if (!response.ok) throw new Error("Failed to add item");

      toast.success("Item added successfully");
      resetForm();
      onClose();
      onSuccess();
    } catch (error) {
      toast.error("Failed to add item");
      console.error("Error adding inventory item:", error);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <CRUDDialog
      open={isOpen}
      onOpenChange={(open) => {
        onClose();
        if (!open) resetForm();
      }}
      title="Add Inventory Item"
      description="Add a new item to your inventory"
      isLoading={isPending}
      onSubmit={handleSubmit}
      submitLabel="Add Item"
    >
      <FormFieldGroup
        label="Item Name"
        required
        error={formData.name ? undefined : "Item name is required"}
      >
        <Input
          id="name"
          value={formData.name}
          onChange={(e) =>
            setFormData({ ...formData, name: e.target.value })
          }
          placeholder="e.g., Paracetamol 500mg"
          required
        />
      </FormFieldGroup>

      <FormFieldGroup
        label="Category"
        required
        error={formData.category ? undefined : "Category is required"}
      >
        <Select
          value={formData.category}
          onValueChange={(value) =>
            setFormData({ ...formData, category: value })
          }
        >
          <SelectTrigger id="category">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="medicine">Medicine</SelectItem>
            <SelectItem value="medical-supply">Medical Supply</SelectItem>
            <SelectItem value="equipment">Equipment</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </FormFieldGroup>

      <FormFieldGroup
        label="Quantity"
        required
        error={formData.quantity ? undefined : "Quantity is required"}
      >
        <Input
          id="quantity"
          type="number"
          min="0"
          value={formData.quantity}
          onChange={(e) =>
            setFormData({ ...formData, quantity: e.target.value })
          }
          placeholder="0"
          required
        />
      </FormFieldGroup>

      <FormFieldGroup label="Minimum Stock Level">
        <Input
          id="minStock"
          type="number"
          min="0"
          value={formData.minStock}
          onChange={(e) =>
            setFormData({ ...formData, minStock: e.target.value })
          }
        />
      </FormFieldGroup>

      <FormFieldGroup label="Expiry Date">
        <Input
          id="expiryDate"
          type="date"
          value={formData.expiryDate}
          onChange={(e) =>
            setFormData({ ...formData, expiryDate: e.target.value })
          }
        />
      </FormFieldGroup>
    </CRUDDialog>
  );
}
