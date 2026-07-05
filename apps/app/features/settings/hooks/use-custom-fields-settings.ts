"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  createCustomFieldRequestSchema,
  type CreateCustomFieldRequest,
  type CustomField,
} from "@workspace/types";
import {
  useCustomFields,
  useCreateCustomField,
  useDeleteCustomField,
  useUpdateCustomField,
} from "@workspace/data-access";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";

const EMPTY_FORM: CreateCustomFieldRequest = {
  name: "",
  fieldType: "text",
  options: "",
  required: false,
};

/** Custom-field definitions state + create/edit/delete for the settings panel. */
export function useCustomFieldsSettings() {
  const { data: fields = [], isLoading, isError, refetch } = useCustomFields();
  const createField = useCreateCustomField();
  const updateField = useUpdateCustomField();
  const deleteField = useDeleteCustomField();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [editing, setEditing] = useState<CustomField | null>(null);

  const form = useForm<CreateCustomFieldRequest>({
    resolver: zodResolver(createCustomFieldRequestSchema),
    defaultValues: EMPTY_FORM,
  });

  const status = useMemo<"loading" | "error" | "empty" | "success">(() => {
    if (isLoading) return "loading";
    if (isError) return "error";
    if (fields.length === 0) return "empty";
    return "success";
  }, [isLoading, isError, fields.length]);

  const openCreate = () => {
    setEditing(null);
    form.reset(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (field: CustomField) => {
    setEditing(field);
    form.reset({
      name: field.name,
      fieldType: field.fieldType,
      options: field.options ?? "",
      required: field.required,
    });
    setDialogOpen(true);
  };

  const onSubmit = (data: CreateCustomFieldRequest) => {
    const isSelect = data.fieldType === "select";
    const payload = {
      name: data.name,
      fieldType: data.fieldType,
      // options only carry meaning for a select field
      options: isSelect ? data.options || undefined : undefined,
      required: data.required ?? false,
    };

    if (editing) {
      updateField.mutate(
        { id: editing.id, ...payload },
        {
          onSuccess: () => {
            toast.success("Custom field updated");
            setDialogOpen(false);
          },
          onError: (error) => showUserFacingErrorToast(error),
        },
      );
    } else {
      createField.mutate(
        { ...payload, order: fields.length },
        {
          onSuccess: () => {
            toast.success("Custom field added");
            setDialogOpen(false);
          },
          onError: (error) => showUserFacingErrorToast(error),
        },
      );
    }
  };

  const confirmDelete = (id: string) => setDeleteTargetId(id);
  const cancelDelete = () => setDeleteTargetId(null);

  const executeDelete = () => {
    if (!deleteTargetId) return;
    deleteField.mutate(
      { id: deleteTargetId },
      {
        onSuccess: () => {
          toast.success("Custom field removed");
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
    fields,
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
    isSaving: createField.isPending || updateField.isPending,
    isDeleting: deleteField.isPending,
  };
}
