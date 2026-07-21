import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  inventoryAddItemFormSchema, type InventoryAddItemFormValues, } from "@workspace/types";
import { FormControl, FormField, Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/form/form-primitives"
import { CRUDDialog, DatePicker, Form, FormFieldGroup } from "@workspace/ui/components";
export type InventoryItemFormData = InventoryAddItemFormValues;

export interface CategoryOption {
  value: string;
  label: string;
}

export interface InventoryAddItemDialogUIProps {
  isOpen: boolean;
  defaultValues?: Partial<InventoryAddItemFormValues>;
  isLoading: boolean;
  onClose: () => void;
  onSubmit: (data: InventoryAddItemFormValues) => void;
  categories?: CategoryOption[];
}

export function InventoryAddItemDialogUI({
  isOpen,
  defaultValues,
  isLoading,
  onClose,
  onSubmit,
  categories = [],
}: InventoryAddItemDialogUIProps) {
  const form = useForm<InventoryAddItemFormValues>({
    resolver: zodResolver(inventoryAddItemFormSchema),
    defaultValues: {
      name: "",
      category: "",
      quantity: "",
      minStock: "",
      expiryDate: "",
      ...defaultValues,
    },
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        name: "",
        category: "",
        quantity: "",
        minStock: "",
        expiryDate: "",
        ...defaultValues,
      });
    }
  }, [isOpen, defaultValues, form]);

  const handleSubmit = (data: InventoryAddItemFormValues) => {
    onSubmit(data);
  };

  return (
    <CRUDDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title="Add Inventory Item"
      description="Add a new item to your inventory"
      isLoading={isLoading}
      onSubmit={form.handleSubmit(handleSubmit)}
      submitLabel="Add item"
    >
      <Form {...form}>
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormFieldGroup
                label="Item name"
                required
                error={form.formState.errors.name?.message}
              >
                <FormControl>
                  <Input placeholder="Item name" {...field} />
                </FormControl>
              </FormFieldGroup>
            )}
          />

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormFieldGroup
                label="Category"
                required
                error={form.formState.errors.category?.message}
              >
                <Select
                  onValueChange={field.onChange}
                  value={field.value ?? ""}
                >
                  <FormControl>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormFieldGroup>
            )}
          />

          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormFieldGroup
                label="Quantity"
                required
                error={form.formState.errors.quantity?.message}
              >
                <FormControl>
                  <Input type="number" min="0" placeholder="Quantity" {...field} />
                </FormControl>
              </FormFieldGroup>
            )}
          />

          <FormField
            control={form.control}
            name="minStock"
            render={({ field }) => (
              <FormFieldGroup
                label="Minimum Stock Level"
                error={form.formState.errors.minStock?.message}
              >
                <FormControl>
                  <Input type="number" min="0" {...field} />
                </FormControl>
              </FormFieldGroup>
            )}
          />

          <FormField
            control={form.control}
            name="expiryDate"
            render={({ field }) => (
              <FormFieldGroup
                label="Expiry Date"
                error={form.formState.errors.expiryDate?.message}
              >
                <FormControl>
                  <DatePicker
                    value={field.value || undefined}
                    onChange={(date) =>
                      field.onChange(date?.toISOString().slice(0, 10) ?? "")
                    }
                    placeholder="Expiry date"
                  />
                </FormControl>
              </FormFieldGroup>
            )}
          />
        </div>
      </Form>
    </CRUDDialog>
  );
}
