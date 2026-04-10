import { useCallback, useState } from "react";
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
import { usePatients } from "@/hooks/api/use-patients";
import { Patient } from "@workspace/types";
import { useDebounce } from "@workspace/hooks/use-debounce";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor?: string;
  hasMore: boolean;
  count: number;
}

export const createLabTestOrderSchema = z.object({
  patientId: z.string().min(1, "Patient is required"),
  labTestId: z.string().min(1, "Test is required"),
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
          "We could not create the lab test order. Please try again.",
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
