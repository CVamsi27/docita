import { useCallback, useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useNavigate } from "react-router";
import { useInvoice, useUpdateInvoice } from "@workspace/data-access";
import {
  invoiceEditFormSchema,
  type InvoiceEditFormValues,
  type Invoice,
} from "@workspace/types";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import {
  applyInvoiceDiscountToFirstLine,
  calculateInvoiceTotals,
  createDefaultInvoiceItems,
} from "@/features/invoices/rules/invoice-rules";

const normalizeInvoiceStatus = (
  status: Invoice["status"] | "created",
): InvoiceEditFormValues["status"] => {
  if (status === "created") return "PENDING";

  return status;
};

export const useInvoiceEditLogic = (invoiceId: string) => {
  const router = useNavigate();
  const [isSaving, setIsSaving] = useState(false);

  const { data: invoice, isLoading, error, refetch } = useInvoice(invoiceId);

  const updateInvoice = useUpdateInvoice(invoiceId);

  const form = useForm<InvoiceEditFormValues>({
    resolver: zodResolver(invoiceEditFormSchema),
    defaultValues: {
      status: "PENDING",
      discount: 0,
      notes: "",
      items: createDefaultInvoiceItems(),
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
          discountAmount: item.discountAmount ?? 0,
          taxTreatment: item.taxTreatment ?? "EXEMPT_HEALTHCARE",
          taxRate: item.taxRate ?? 0,
          hsnCode: item.hsnCode,
          sacCode: item.sacCode,
        })) || [
          {
            description: "",
            quantity: 1,
            price: 0,
            taxTreatment: "EXEMPT_HEALTHCARE",
            taxRate: 0,
          },
        ],
      });
    }
  }, [invoice, form]);

  const calculateTotal = useCallback((values: InvoiceEditFormValues) => {
    return calculateInvoiceTotals(values.items, values.discount || 0)
      .grandTotal;
  }, []);

  const totalAmount = calculateTotal(form.watch());

  const onSubmit = async (data: InvoiceEditFormValues) => {
    try {
      setIsSaving(true);
      await updateInvoice.mutateAsync({
        ...data,
        items: applyInvoiceDiscountToFirstLine(data.items, data.discount || 0),
      });
      toast.success("Invoice updated successfully");
      router(`/invoices/${invoiceId}`);
    } catch (err) {
      showUserFacingErrorToast(
        err,
        "We could not save this invoice. Please try again.",
      );
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
    error,
    refetch,
    isSaving,
    totalAmount,
    router,
  };
};
