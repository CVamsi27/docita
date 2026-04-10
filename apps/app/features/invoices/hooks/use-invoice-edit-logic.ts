import { useCallback, useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useInvoice, useUpdateInvoice } from "@/hooks/api/use-billing";
import { useRouter } from "next/navigation";
import { Invoice } from "@workspace/types";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";

export const invoiceItemSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  price: z.number().min(0, "Price must be positive"),
});

export const invoiceSchema = z.object({
  status: z.enum(["PENDING", "PAID", "OVERDUE", "CANCELLED", "PARTIALLY_PAID"]),
  discount: z.number().min(0),
  notes: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1, "At least one item is required"),
});

export type InvoiceFormValues = z.infer<typeof invoiceSchema>;

const normalizeInvoiceStatus = (
  status: Invoice["status"] | "created",
): InvoiceFormValues["status"] => {
  if (status === "created") {
    return "PENDING";
  }

  return status;
};

export const useInvoiceEditLogic = (invoiceId: string) => {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  const { data: invoice, isLoading } = useInvoice(invoiceId);

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

  useEffect(() => {
    if (invoice) {
      form.reset({
        status: normalizeInvoiceStatus(invoice.status),
        discount: 0,
        notes: invoice.notes || "",
        items: invoice.items?.map((item) => ({
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
    } catch {
      showUserFacingErrorToast("We could not update invoice. Please try again.");

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
