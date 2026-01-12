
import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { apiHooks } from "@/lib/api-hooks";
import { Patient, LabTest, Doctor } from "@workspace/types";

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

    const {
        data: labTests = [],
        isLoading,
        refetch,
        isFetching,
    } = apiHooks.useLabTestOrders();

    const { data: stats, refetch: refetchStats } = apiHooks.useLabTestStats();

    // Search logic for patients for sorting/dropdown
    const { data: patientsResponse, isLoading: patientsLoading } =
        apiHooks.usePatients({
            ...(patientSearch && { search: patientSearch }),
            limit: patientSearch ? 20 : 5,
        });

    const paginatedResponse = patientsResponse as
        | PaginatedResponse<Patient>
        | undefined;
    const patients: Patient[] = paginatedResponse?.items || [];

    const { data: testCatalog = [], isLoading: catalogLoading } =
        apiHooks.useLabTestCatalog();

    const { mutateAsync: createOrder, isPending: isCreating } =
        apiHooks.useCreateLabTestOrder();

    const form = useForm<CreateLabTestOrderInput>({
        resolver: zodResolver(createLabTestOrderSchema),
        defaultValues: {
            patientId: "",
            labTestId: "",
            appointmentId: undefined,
            notes: "",
        },
    });

    // Get selected patient and test for display
    const selectedPatient = patients.find(
        (p) => p.id === form.watch("patientId"),
    );
    const selectedTest = testCatalog.find(
        (t: any) => t.id === form.watch("labTestId"),
    );

    const filteredTests = labTests.filter((test: any) => {
        const patientName = test.patient
            ? `${test.patient.firstName} ${test.patient.lastName}`.toLowerCase()
            : "";
        const testName = test.labTest?.name?.toLowerCase() || "";
        const doctorName = test.doctor?.name?.toLowerCase() || "";
        const search = searchQuery.toLowerCase();

        return (
            patientName.includes(search) ||
            testName.includes(search) ||
            doctorName.includes(search)
        );
    });

    const onSubmitOrder = useCallback(
        async (data: CreateLabTestOrderInput) => {
            try {
                await createOrder(data);
                form.reset();
                setIsOrderDialogOpen(false);
                refetch();
                toast.success("Lab test order created successfully");
            } catch (error) {
                console.error("Failed to create lab test order:", error);
                const errorMessage =
                    error instanceof Error
                        ? error.message
                        : "Failed to create lab test order. Please try again.";
                toast.error(errorMessage);
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
        handleRefresh,
    };
};
