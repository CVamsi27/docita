"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  type InternalAdminUser,
  useInternalClinicAdmins,
  useInternalClinics,
} from "@workspace/data-access/internal";
import { useAuth } from "@/lib/auth/auth";
import { internalQueryKeys } from "@/lib/api/query-keys";
import { useInternalFiltersStore } from "@/lib/stores/internal-filters-store";
import { getUserFacingErrorMessage } from "@workspace/utils";
import type { DataStateStatus } from "@workspace/ui/components/data-display/data-state";
import {
  buildPageStatus,
  type CreateForm,
  type EditForm,
  filterAdmins,
  getRoleBadgeVariant,
  getRoleLabel,
} from "./admin-helpers";
import { useAdminMutations } from "./use-admin-mutations";

export type Admin = InternalAdminUser;
export type { CreateForm, EditForm };

const EMPTY_CLINICS: { id: string; name: string }[] = [];

export function useAdminsPage() {
  const queryClient = useQueryClient();
  const { adminSearch, selectedClinic, setAdminSearch, setSelectedClinic } =
    useInternalFiltersStore();
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>({
    name: "", email: "", password: "", phoneNumber: "", adminType: "admin",
  });
  const [editForm, setEditForm] = useState<EditForm>({
    name: "", email: "", phoneNumber: "", adminType: "admin",
  });
  const { token } = useAuth();

  const clinicsQuery = useInternalClinics(token);
  const clinics = useMemo(
    () => clinicsQuery.data ?? EMPTY_CLINICS,
    [clinicsQuery.data],
  );
  useEffect(() => {
    if ((!selectedClinic || selectedClinic === "all") && clinics.length > 0) {
      setSelectedClinic(clinics[0]?.id ?? "");
    }
  }, [clinics, selectedClinic, setSelectedClinic]);

  const adminsQuery = useInternalClinicAdmins(token, selectedClinic);
  const admins = adminsQuery.data ?? [];

  const {
    handleCreateAdmin,
    handleSaveAdmin,
    handleDeactivateAdmin,
    handleActivateAdmin,
    saving,
  } = useAdminMutations({
    token,
    selectedClinic,
    selectedAdmin,
    createForm,
    editForm,
    onInvalidate: () =>
      queryClient.invalidateQueries({
        queryKey: internalQueryKeys.internal.clinicAdmins(
          selectedClinic || "none",
        ),
      }),
    onCreated: () => {
      setIsCreateOpen(false);
      setCreateForm({ name: "", email: "", password: "", phoneNumber: "", adminType: "admin" });
    },
    onUpdated: () => setIsEditOpen(false),
  });

  const handleViewAdmin = (admin: Admin) => { setSelectedAdmin(admin); setIsViewOpen(true); };
  const handleEditAdmin = (admin: Admin) => {
    setSelectedAdmin(admin);
    setEditForm({
      name: admin.name, email: admin.email,
      phoneNumber: admin.phoneNumber || "",
      adminType: admin.role === "ADMIN_DOCTOR" ? "admin_doctor" : "admin",
    });
    setIsEditOpen(true);
  };

  const filteredAdmins = filterAdmins(admins, adminSearch, selectedClinic);
  const loading = clinicsQuery.isLoading || adminsQuery.isLoading;
  const loadError =
    clinicsQuery.isError || adminsQuery.isError
      ? getUserFacingErrorMessage(clinicsQuery.error ?? adminsQuery.error, {
          context: "load", fallback: "We could not load admins. Please try again.",
        })
      : null;
  const pageStatus: DataStateStatus = buildPageStatus(loading, loadError);

  return {
    adminSearch, selectedClinic, setAdminSearch, setSelectedClinic, clinics,
    filteredAdmins, selectedAdmin, isViewOpen, setIsViewOpen, isCreateOpen,
    setIsCreateOpen, isEditOpen, setIsEditOpen, createForm, setCreateForm, editForm,
    setEditForm, pageStatus, loadError, saving, handleRetry: () => { void clinicsQuery.refetch(); void adminsQuery.refetch(); },
    handleCreateAdmin, handleViewAdmin, handleEditAdmin, handleSaveAdmin,
    handleDeactivateAdmin, handleActivateAdmin, getRoleLabel, getRoleBadgeVariant,
  };
}
