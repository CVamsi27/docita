import { useCallback, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useCreateInvoice } from "@/hooks/api/use-billing";
import { usePatients } from "@/hooks/api/use-patients";
import { useRouter } from "next/navigation";
import { invoiceItemSchema } from "./use-invoice-edit-logic";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import {
  applyInvoiceDiscountToFirstLine,
  calculateInvoiceTotals,
} from "@/features/invoices/rules/invoiceRules";

export const createInvoiceSchema = z.object({
  patientId: z.string().min(1, "Select a patient"),
  status: z.enum(["PENDING", "PAID", "OVERDUE", "CANCELLED"]),
  discount: z.number().min(0),
  notes: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1, "Add at least one item"),
});

export type CreateInvoiceFormValues = z.infer<typeof createInvoiceSchema>;

export const useInvoiceCreateLogic = () => {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [patientComboboxOpen, setPatientComboboxOpen] = useState(false);

  const { data: patientsData, isLoading: patientsLoading } = usePatients({
    search: patientSearch,
    limit: 10,
  });

  const createInvoice = useCreateInvoice();

  const form = useForm<CreateInvoiceFormValues>({
    resolver: zodResolver(createInvoiceSchema),
    defaultValues: {
      patientId: "",
      status: "PENDING",
      discount: 0,
      notes: "",
      items: [
        {
          description: "",
          quantity: 1,
          price: 0,
          taxTreatment: "EXEMPT_HEALTHCARE",
          taxRate: 0,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const calculateTotal = useCallback((values: CreateInvoiceFormValues) => {
    return calculateInvoiceTotals(values.items, values.discount || 0)
      .grandTotal;
  }, []);

  const totalAmount = calculateTotal(form.watch());

  const onSubmit = async (data: CreateInvoiceFormValues) => {
    try {
      setIsSaving(true);

      const payload = {
        ...data,
        items: applyInvoiceDiscountToFirstLine(data.items, data.discount || 0),
        notes: data.notes ?? "",
        total: totalAmount,
      };

      const result = await createInvoice.mutateAsync(payload);
      toast.success("Invoice created successfully");

      requestAnimationFrame(() => {
        router.push(`/invoices/${result.id}`);
      });
    } catch {
      showUserFacingErrorToast(
        "We could not create this invoice. Please try again.",
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
    isSaving,
    totalAmount,
    router,

    patients: patientsData?.items || [],
    patientsLoading,
    patientSearch,
    setPatientSearch,
    patientComboboxOpen,
    setPatientComboboxOpen,
  };
};
