"use client";

import { AppPageScaffold } from "@workspace/ui/components/layout/app-page-scaffold";
import { PageHeader } from "@workspace/ui/components/layout/page-header";
import { DataState } from "@workspace/ui/components/data-display/data-state";
import { useAdminsPage } from "./use-admins-page";
import {
  AdminCreateDialog,
  AdminEditDialog,
  AdminsFiltersBar,
  AdminsTable,
  AdminViewDialog,
} from "./admins-page-sections";

export default function AdminsPage() {
  const {
    adminSearch,
    selectedClinic,
    setAdminSearch,
    setSelectedClinic,
    clinics,
    filteredAdmins,
    selectedAdmin,
    isViewOpen,
    setIsViewOpen,
    isCreateOpen,
    setIsCreateOpen,
    isEditOpen,
    setIsEditOpen,
    createForm,
    setCreateForm,
    editForm,
    setEditForm,
    pageStatus,
    loadError,
    saving,
    handleRetry,
    handleCreateAdmin,
    handleViewAdmin,
    handleEditAdmin,
    handleSaveAdmin,
    handleDeactivateAdmin,
    handleActivateAdmin,
    getRoleLabel,
    getRoleBadgeVariant,
  } = useAdminsPage();

  return (
    <AppPageScaffold
      header={
        <PageHeader
          title="Admins"
          description="Manage clinic administrators and admin doctors"
          size="compact"
        />
      }
    >
      <DataState
        status={pageStatus}
        loadingMessage="Loading admins…"
        errorMessage={loadError ?? undefined}
        onRetry={handleRetry}
      >
        <AdminsFiltersBar
          adminSearch={adminSearch}
          onSearchChange={setAdminSearch}
          selectedClinic={selectedClinic}
          onClinicChange={setSelectedClinic}
          clinics={clinics}
          onAddAdmin={() => setIsCreateOpen(true)}
        />
        <AdminsTable
          admins={filteredAdmins}
          selectedClinic={selectedClinic}
          onView={handleViewAdmin}
          onEdit={handleEditAdmin}
          onDeactivate={handleDeactivateAdmin}
          onActivate={handleActivateAdmin}
          getRoleLabel={getRoleLabel}
          getRoleBadgeVariant={getRoleBadgeVariant}
        />
        <AdminViewDialog
          open={isViewOpen}
          onOpenChange={setIsViewOpen}
          admin={selectedAdmin}
          getRoleLabel={getRoleLabel}
          getRoleBadgeVariant={getRoleBadgeVariant}
        />
        <AdminCreateDialog
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
          form={createForm}
          onFormChange={setCreateForm}
          onCreate={handleCreateAdmin}
          saving={saving}
        />
        <AdminEditDialog
          open={isEditOpen}
          onOpenChange={setIsEditOpen}
          form={editForm}
          onFormChange={setEditForm}
          onSave={handleSaveAdmin}
          saving={saving}
        />
      </DataState>
    </AppPageScaffold>
  );
}
