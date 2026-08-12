import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  createLabRequestSchema,
  type CreateLabRequest,
  type LabContractResponse,
} from "@workspace/types";
import { useCreateLab, useLabs, useUpdateLab } from "@workspace/data-access";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";

const EMPTY_FORM: CreateLabRequest = {
  name: "",
  type: "INTERNAL",
  phone: "",
  email: "",
  address: "",
};

/** Lab directory state + create/edit/activate actions for the settings panel. */
export function useLabDirectory() {
  const { data: labs = [], isLoading, isError, refetch } = useLabs();
  const createLab = useCreateLab();
  const updateLab = useUpdateLab();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LabContractResponse | null>(null);

  const form = useForm<CreateLabRequest>({
    resolver: zodResolver(createLabRequestSchema),
    defaultValues: EMPTY_FORM,
  });

  const status = useMemo<"loading" | "error" | "empty" | "success">(() => {
    if (isLoading) return "loading";
    if (isError) return "error";
    if (labs.length === 0) return "empty";
    return "success";
  }, [isLoading, isError, labs.length]);

  const openCreate = () => {
    setEditing(null);
    form.reset(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (lab: LabContractResponse) => {
    setEditing(lab);
    form.reset({
      name: lab.name,
      type: lab.type,
      phone: lab.phone ?? "",
      email: lab.email ?? "",
      address: lab.address ?? "",
    });
    setDialogOpen(true);
  };

  const onSubmit = (data: CreateLabRequest) => {
    const payload = {
      name: data.name,
      type: data.type,
      phone: data.phone || undefined,
      email: data.email || undefined,
      address: data.address || undefined,
    };
    if (editing) {
      updateLab.mutate(
        { id: editing.id, ...payload },
        {
          onSuccess: () => {
            toast.success("Lab updated");
            setDialogOpen(false);
          },
          onError: (error) => showUserFacingErrorToast(error),
        },
      );
    } else {
      createLab.mutate(payload, {
        onSuccess: () => {
          toast.success("Lab added");
          setDialogOpen(false);
        },
        onError: (error) => showUserFacingErrorToast(error),
      });
    }
  };

  const toggleActive = (lab: LabContractResponse) => {
    updateLab.mutate(
      { id: lab.id, active: !lab.active },
      {
        onSuccess: () =>
          toast.success(lab.active ? "Lab deactivated" : "Lab activated"),
        onError: (error) => showUserFacingErrorToast(error),
      },
    );
  };

  return {
    labs,
    status,
    refetch,
    form,
    dialogOpen,
    setDialogOpen,
    editing,
    openCreate,
    openEdit,
    onSubmit,
    toggleActive,
    isSaving: createLab.isPending || updateLab.isPending,
  };
}
