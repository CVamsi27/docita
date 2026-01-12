import { CRUDDialog, FormFieldGroup } from "@workspace/ui/components";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Input } from "@workspace/ui/components/input";

export interface InventoryItemFormData {
  name: string;
  category: string;
  quantity: string;
  expiryDate: string;
  minStock: string;
}

export interface CategoryOption {
  value: string;
  label: string;
}

export interface InventoryAddItemDialogUIProps {
  isOpen: boolean;
  formData: InventoryItemFormData;
  isLoading: boolean;
  onClose: () => void;
  onFormChange: (data: Partial<InventoryItemFormData>) => void;
  onSubmit: (e: React.FormEvent) => void;
  categories?: CategoryOption[];
}

export function InventoryAddItemDialogUI({
  isOpen,
  formData,
  isLoading,
  onClose,
  onFormChange,
  onSubmit,
  categories = [],
}: InventoryAddItemDialogUIProps) {
  return (
    <CRUDDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Add Inventory Item"
      description="Add a new item to your inventory"
      isLoading={isLoading}
      onSubmit={onSubmit}
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
          onChange={(e) => onFormChange({ name: e.target.value })}
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
          onValueChange={(value) => onFormChange({ category: value })}
        >
          <SelectTrigger id="category">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.value} value={category.value}>
                {category.label}
              </SelectItem>
            ))}
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
          onChange={(e) => onFormChange({ quantity: e.target.value })}
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
          onChange={(e) => onFormChange({ minStock: e.target.value })}
        />
      </FormFieldGroup>

      <FormFieldGroup label="Expiry Date">
        <Input
          id="expiryDate"
          type="date"
          value={formData.expiryDate}
          onChange={(e) => onFormChange({ expiryDate: e.target.value })}
        />
      </FormFieldGroup>
    </CRUDDialog>
  );
}
