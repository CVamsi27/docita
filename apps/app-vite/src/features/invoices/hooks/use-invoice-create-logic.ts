import { useCallback, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useNavigate } from "react-router";
import { useCreateInvoice, usePatients } from "@workspace/data-access";
import {
  createInvoiceFormSchema,
  type CreateInvoiceFormValues,
} from "@workspace/types";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import {
  applyInvoiceDiscountToFirstLine,
  calculateInvoiceTotals,
  createDefaultInvoiceItems,
} from "@/features/invoices/rules/invoice-rules";


export const useInvoiceCreateLogic = () => {
  const router = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [patientComboboxOpen, setPatientComboboxOpen] = useState(false);

  const { data: patientsData, isLoading: patientsLoading } = usePatients({
    search: patientSearch,
    limit: 10,
  });

  const createInvoice = useCreateInvoice();

  const form = useForm<CreateInvoiceFormValues>({
    resolver: zodResolver(createInvoiceFormSchema),
    defaultValues: {
      patientId: "",
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
        router(`/invoices/${result.id}`);
      });
    } catch (err) {
      showUserFacingErrorToast(
        err,
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
