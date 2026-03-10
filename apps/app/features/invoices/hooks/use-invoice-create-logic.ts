import { useCallback, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useCreateInvoice } from "@/hooks/api/use-billing";
import { usePatients } from "@/hooks/api/use-patients";
import { useRouter } from "next/navigation";
import { invoiceItemSchema } from "./use-invoice-edit-logic";

export const createInvoiceSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  status: z.enum(["PENDING", "PAID", "OVERDUE", "CANCELLED"]),
  discount: z.number().min(0),
  notes: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1, "At least one item is required"),
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
      items: [{ description: "", quantity: 1, price: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const calculateTotal = useCallback((values: CreateInvoiceFormValues) => {
    const subtotal = values.items.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0,
    );
    return Math.max(0, subtotal - (values.discount || 0));
  }, []);

  const totalAmount = calculateTotal(form.watch());

  const onSubmit = async (data: CreateInvoiceFormValues) => {
    try {
      setIsSaving(true);

      const payload = {
        ...data,
        notes: data.notes ?? "",
        total: totalAmount, 
      };

      const result = await createInvoice.mutateAsync(payload);
      toast.success("Invoice created successfully");

      requestAnimationFrame(() => {
        router.push(`/invoices/${result.id}`);
      });
    } catch {
      toast.error("Failed to create invoice");

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
