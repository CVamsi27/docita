"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { client } from "@/lib/api/api-client";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import {
  ACTIVATE_GENERIC_ERROR,
  ADMIN_ACTIVATE_SUCCESS,
  ADMIN_CREATE_SUCCESS,
  ADMIN_DEACTIVATE_SUCCESS,
  ADMIN_UPDATE_SUCCESS,
  CREATE_GENERIC_ERROR,
  type CreateForm,
  DEACTIVATE_CONFIRM_MESSAGE,
  DEACTIVATE_GENERIC_ERROR,
  EDIT_GENERIC_ERROR,
  type EditForm,
  validateCreateForm,
  validateEditForm,
} from "./admin-helpers";

interface UseAdminMutationsParams {
  token: string | null;
  selectedClinic: string | null;
  selectedAdmin: { id: string } | null;
  createForm: CreateForm;
  editForm: EditForm;
  onInvalidate: () => Promise<void>;
  onCreated: () => void;
  onUpdated: () => void;
}

export function useAdminMutations({
  token,
  selectedClinic,
  selectedAdmin,
  createForm,
  editForm,
  onInvalidate,
  onCreated,
  onUpdated,
}: UseAdminMutationsParams) {
  const createAdminMutation = useMutation({
    mutationFn: () =>
      client.post(`/internal/clinics/${selectedClinic}/admins`, {
        name: createForm.name,
        email: createForm.email,
        password: createForm.password,
        phoneNumber: createForm.phoneNumber || undefined,
        adminType: createForm.adminType,
      }),
    onSuccess: async () => {
      toast.success(ADMIN_CREATE_SUCCESS);
      onCreated();
      await onInvalidate();
    },
  });

  const updateAdminMutation = useMutation({
    mutationFn: () =>
      client.patch(`/internal/admins/${selectedAdmin?.id}`, {
        name: editForm.name,
        email: editForm.email,
        phoneNumber: editForm.phoneNumber || undefined,
        adminType: editForm.adminType,
      }),
    onSuccess: async () => {
      toast.success(ADMIN_UPDATE_SUCCESS);
      onUpdated();
      await onInvalidate();
    },
  });

  const deactivateAdminMutation = useMutation({
    mutationFn: (adminId: string) =>
      client.patch(`/internal/admins/${adminId}/deactivate`, {}),
    onSuccess: async () => {
      toast.success(ADMIN_DEACTIVATE_SUCCESS);
      await onInvalidate();
    },
  });

  const activateAdminMutation = useMutation({
    mutationFn: (adminId: string) =>
      client.patch(`/internal/admins/${adminId}/activate`, {}),
    onSuccess: async () => {
      toast.success(ADMIN_ACTIVATE_SUCCESS);
      await onInvalidate();
    },
  });

  const handleCreateAdmin = async () => {
    if (!selectedClinic || !token || selectedClinic === "all") return;

    const validationError = validateCreateForm(createForm);
    if (validationError) {
      showUserFacingErrorToast(validationError);
      return;
    }

    try {
      await createAdminMutation.mutateAsync();
    } catch {
      showUserFacingErrorToast(CREATE_GENERIC_ERROR);
    }
  };

  const handleSaveAdmin = async () => {
    if (!selectedAdmin || !token) return;

    const validationError = validateEditForm(editForm);
    if (validationError) {
      showUserFacingErrorToast(validationError);
      return;
    }

    try {
      await updateAdminMutation.mutateAsync();
    } catch {
      showUserFacingErrorToast(EDIT_GENERIC_ERROR);
    }
  };

  const handleDeactivateAdmin = async (adminId: string) => {
    if (!token) return;

    if (!window.confirm(DEACTIVATE_CONFIRM_MESSAGE)) {
      return;
    }

    try {
      await deactivateAdminMutation.mutateAsync(adminId);
    } catch {
      showUserFacingErrorToast(DEACTIVATE_GENERIC_ERROR);
    }
  };

  const handleActivateAdmin = async (adminId: string) => {
    if (!token) return;

    try {
      await activateAdminMutation.mutateAsync(adminId);
    } catch {
      showUserFacingErrorToast(ACTIVATE_GENERIC_ERROR);
    }
  };

  const saving =
    createAdminMutation.isPending ||
    updateAdminMutation.isPending ||
    deactivateAdminMutation.isPending ||
    activateAdminMutation.isPending;

  return {
    handleCreateAdmin,
    handleSaveAdmin,
    handleDeactivateAdmin,
    handleActivateAdmin,
    saving,
  };
}
