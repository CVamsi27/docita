import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  useCreateLabTestOrder,
  useLabTestCatalog,
  useLabTestOrders,
  useLabTestStats,
} from "@/hooks/api/use-clinical";
import { usePatients } from "@workspace/data-access";
import { Patient, type PaginatedResponse } from "@workspace/types";
import { useDebounce } from "@workspace/hooks/use-debounce";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";

export const createLabTestOrderSchema = z.object({
  patientId: z.string().min(1, "Select a patient"),
  labTestId: z.string().min(1, "Select a test"),
  appointmentId: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateLabTestOrderInput = z.infer<typeof createLabTestOrderSchema>;

export const useLabTestsLogic = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [testSearch, setTestSearch] = useState("");
  const [patientComboboxOpen, setPatientComboboxOpen] = useState(false);
  const [testComboboxOpen, setTestComboboxOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const debouncedSearch = useDebounce(searchQuery, 300);

  const {
    data: labTests = [],
    isLoading,
    refetch,
    isFetching,
  } = useLabTestOrders({
    search: debouncedSearch,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  const { data: stats, refetch: refetchStats } = useLabTestStats();

  const { data: patientsResponse, isLoading: patientsLoading } = usePatients({
    ...(patientSearch && { search: patientSearch }),
    limit: patientSearch ? 20 : 5,
  });

  const paginatedResponse = patientsResponse as
    | PaginatedResponse<Patient>
    | undefined;
  const patients: Patient[] = paginatedResponse?.items || [];

  const { data: testCatalog = [], isLoading: catalogLoading } =
    useLabTestCatalog();

  const { mutateAsync: createOrder, isPending: isCreating } =
    useCreateLabTestOrder();

  const form = useForm<CreateLabTestOrderInput>({
    resolver: zodResolver(createLabTestOrderSchema),
    defaultValues: {
      patientId: "",
      labTestId: "",
      appointmentId: undefined,
      notes: "",
    },
  });

  useEffect(() => {
    if (!isOrderDialogOpen) {
      setPatientSearch("");
      setTestSearch("");
      setPatientComboboxOpen(false);
      setTestComboboxOpen(false);
    }
  }, [isOrderDialogOpen]);

  const selectedPatient = patients.find(
    (p) => p.id === form.watch("patientId"),
  );
  const selectedTest = testCatalog.find(
    (t: { id: string }) => t.id === form.watch("labTestId"),
  );

  const filteredTests = labTests;

  const onSubmitOrder = useCallback(
    async (data: CreateLabTestOrderInput) => {
      try {
        await createOrder(data);
        form.reset();
        setIsOrderDialogOpen(false);
        refetch();
        toast.success("Lab test order created successfully");
      } catch (error) {

        showUserFacingErrorToast(
          error,
          "We could not create this lab test order right now. Please try again.",
          "save",
        );
      }
    },
    [createOrder, form, refetch],
  );

  const handleRefresh = () => {
    refetch();
    refetchStats();
  };

  return {
    labTests,
    filteredTests,
    stats,
    isLoading,
    isFetching,
    searchQuery,
    setSearchQuery,
    isOrderDialogOpen,
    setIsOrderDialogOpen,
    form,
    onSubmitOrder,
    patients,
    patientsLoading,
    testCatalog,
    catalogLoading,
    isCreating,
    patientSearch,
    setPatientSearch,
    testSearch,
    setTestSearch,
    patientComboboxOpen,
    setPatientComboboxOpen,
    testComboboxOpen,
    setTestComboboxOpen,
    selectedPatient,
    selectedTest,
    statusFilter,
    setStatusFilter,
    handleRefresh,
  };
};
