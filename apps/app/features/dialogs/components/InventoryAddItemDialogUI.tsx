import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { CRUDDialog, FormFieldGroup } from "@workspace/ui/components";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import { Input } from "@workspace/ui/components/input";
import { Form, FormControl, FormField } from "@workspace/ui/components/form";
import { requiredStringSchema } from "@/features/_shared/schemas/common.schemas";

// Define schema for inventory item
const inventoryItemSchema = z.object({
  name: requiredStringSchema("Item Name"),
  category: requiredStringSchema("Category"),
  quantity: z
    .string()
    .refine((val) => !isNaN(Number(val)) && Number(val) >= 0, {
      message: "Quantity must be a valid non-negative number",
    }),
  minStock: z
    .string()
    .refine((val) => !val || (!isNaN(Number(val)) && Number(val) >= 0), {
      message: "Minimum stock must be a valid non-negative number",
    })
    .optional(),
  expiryDate: z.string().optional(),
});

type InventoryItemFormValues = z.infer<typeof inventoryItemSchema>;

export type InventoryItemFormData = InventoryItemFormValues;

export interface CategoryOption {
  value: string;
  label: string;
}

export interface InventoryAddItemDialogUIProps {
  isOpen: boolean;
  defaultValues?: Partial<InventoryItemFormValues>;
  isLoading: boolean;
  onClose: () => void;
  onSubmit: (data: InventoryItemFormValues) => void;
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
  const form = useForm<InventoryItemFormValues>({
    resolver: zodResolver(inventoryItemSchema),
    defaultValues: {
      name: "",
      category: "",
      quantity: "",
      minStock: "",
      expiryDate: "",
      ...defaultValues,
    },
  });

  // Reset form when dialog opens/closes
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

  const handleSubmit = (data: InventoryItemFormValues) => {
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
      submitLabel="Add Item"
    >
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleSubmit)}
          noValidate
          className="space-y-4"
        >
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormFieldGroup
                label="Item Name"
                required
                error={form.formState.errors.name?.message}
              >
                <FormControl>
                  <Input placeholder="e.g., Paracetamol 500mg" {...field} />
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
                  defaultValue={field.value}
                  value={field.value}
                >
                  <FormControl>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select category" />
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
                  <Input type="number" min="0" placeholder="0" {...field} />
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
                  <Input
                    type="date"
                    {...field}
                    // Handle empty string for date input
                    value={field.value || ""}
                  />
                </FormControl>
              </FormFieldGroup>
            )}
          />
        </form>
      </Form>
    </CRUDDialog>
  );
}
