import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  createLabTestRequestSchema,
  type CreateLabTestRequest,
  type LabTest,
} from "@workspace/types";
import {
  useCreateLabTest,
  useDeleteLabTest,
  useLabTestCatalog,
  useUpdateLabTest,
} from "@workspace/data-access";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";

const EMPTY_FORM: CreateLabTestRequest = {
  name: "",
  category: "",
  code: "",
  price: undefined,
  description: "",
  active: true,
};

/** Lab test catalog state + create/edit/delete actions for the settings panel. */
export function useLabTestCatalogSettings() {
  const { data: catalog = [], isLoading, isError, refetch } = useLabTestCatalog();
  const createTest = useCreateLabTest();
  const updateTest = useUpdateLabTest();
  const deleteTest = useDeleteLabTest();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [editing, setEditing] = useState<LabTest | null>(null);

  const form = useForm<CreateLabTestRequest>({
    resolver: zodResolver(createLabTestRequestSchema),
    defaultValues: EMPTY_FORM,
  });

  const status = useMemo<"loading" | "error" | "empty" | "success">(() => {
    if (isLoading) return "loading";
    if (isError) return "error";
    if (catalog.length === 0) return "empty";
    return "success";
  }, [isLoading, isError, catalog.length]);

  const openCreate = () => {
    setEditing(null);
    form.reset(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (test: LabTest) => {
    setEditing(test);
    form.reset({
      name: test.name,
      category: test.category,
      code: test.code ?? "",
      price: test.price ?? undefined,
      description: test.description ?? "",
      active: test.active,
    });
    setDialogOpen(true);
  };

  const onSubmit = (data: CreateLabTestRequest) => {
    const payload = {
      name: data.name,
      category: data.category,
      code: data.code || undefined,
      price: data.price,
      description: data.description || undefined,
      active: data.active,
    };

    if (editing) {
      updateTest.mutate(
        { id: editing.id, ...payload },
        {
          onSuccess: () => {
            toast.success("Test updated");
            setDialogOpen(false);
          },
          onError: (error) => showUserFacingErrorToast(error),
        },
      );
    } else {
      createTest.mutate(payload, {
        onSuccess: () => {
          toast.success("Test added to catalog");
          setDialogOpen(false);
        },
        onError: (error) => showUserFacingErrorToast(error),
      });
    }
  };

  const confirmDelete = (id: string) => setDeleteTargetId(id);
  const cancelDelete = () => setDeleteTargetId(null);

  const executeDelete = () => {
    if (!deleteTargetId) return;
    deleteTest.mutate(
      { id: deleteTargetId },
      {
        onSuccess: () => {
          toast.success("Test removed from catalog");
          setDeleteTargetId(null);
        },
        onError: (error) => {
          showUserFacingErrorToast(error);
          setDeleteTargetId(null);
        },
      },
    );
  };

  return {
    catalog,
    status,
    refetch,
    form,
    dialogOpen,
    setDialogOpen,
    editing,
    openCreate,
    openEdit,
    onSubmit,
    confirmDelete,
    cancelDelete,
    executeDelete,
    deleteTargetId,
    isSaving: createTest.isPending || updateTest.isPending,
    isDeleting: deleteTest.isPending,
  };
}
