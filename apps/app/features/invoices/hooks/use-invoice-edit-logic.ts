import { useCallback, useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useInvoice, useUpdateInvoice } from "@/hooks/api/use-billing";
import { useRouter } from "next/navigation";
import { Invoice } from "@workspace/types";

// Schema definition
export const invoiceItemSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  price: z.number().min(0, "Price must be positive"),
});

export const invoiceSchema = z.object({
  status: z.enum(["PENDING", "PAID", "OVERDUE", "CANCELLED"]),
  discount: z.number().min(0),
  notes: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1, "At least one item is required"),
});

export type InvoiceFormValues = z.infer<typeof invoiceSchema>;

export const useInvoiceEditLogic = (invoiceId: string) => {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  const { data: invoice, isLoading, } = useInvoice(invoiceId);

  const updateInvoice = useUpdateInvoice(invoiceId);

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      status: "PENDING",
      discount: 0,
      notes: "",
      items: [{ description: "", quantity: 1, price: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Load data into form when invoice fetch completes
  useEffect(() => {
    if (invoice) {
      // Extended interface to handle potential extra fields from API
      interface ExtendedInvoice extends Invoice {
        discount?: number;
      }
      
      const safeInvoice = invoice as unknown as ExtendedInvoice;

      form.reset({
        status: ((safeInvoice.status as string) === "created"
          ? "PENDING"
          : safeInvoice.status) as "PENDING" | "PAID" | "OVERDUE" | "CANCELLED",
        discount: safeInvoice.discount || 0,
        notes: safeInvoice.notes || "",
        items: safeInvoice.items?.map((item) => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          price: item.price,
        })) || [{ description: "", quantity: 1, price: 0 }],
      });
    }
  }, [invoice, form]);

  const calculateTotal = useCallback((values: InvoiceFormValues) => {
    const subtotal = values.items.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0,
    );
    return Math.max(0, subtotal - (values.discount || 0));
  }, []);

  const totalAmount = calculateTotal(form.watch());

  const onSubmit = async (data: InvoiceFormValues) => {
    try {
      setIsSaving(true);
      await updateInvoice.mutateAsync(data);
      toast.success("Invoice updated successfully");
      router.push(`/invoices/${invoiceId}`);
    } catch (error) {
      toast.error("Failed to update invoice");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  return {
    form,
    fields,
    append,
    remove,
    onSubmit,
    invoice,
    isLoading,
    isSaving,
    totalAmount,
    router,
  };
};
