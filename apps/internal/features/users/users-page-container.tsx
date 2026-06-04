"use client";

import { AppPageScaffold } from "@workspace/ui/components/layout/app-page-scaffold";
import { PageHeader } from "@workspace/ui/components/layout/page-header";
import { DataState } from "@workspace/ui/components/data-display/data-state";
import { Users } from "lucide-react";
import { useUsersData } from "./use-users-data";
import {
  UserStatsCards,
  SearchFilterBar,
  UsersTableSection,
  UserDetailsDialog,
} from "./users-page-container-sections";

export function UsersPageContainer() {
  const {
    clinics,
    users,
    filteredUsers,
    roleStats,
    loading,
    hasError,
    errorMessage,
    searchTerm,
    selectedClinic,
    selectedRole,
    selectedUser,
    isViewOpen,
    setSearchTerm,
    setSelectedClinic,
    setSelectedRole,
    setIsViewOpen,
    handleViewUser,
    retry,
  } = useUsersData();

  const pageStatus = loading ? "loading" : hasError ? "error" : "success";

  return (
    <AppPageScaffold
      header={
        <PageHeader
          title="Team Members"
          description="View and manage all users across facilities"
          size="compact"
        />
      }
    >
      <DataState
        status={pageStatus}
        loadingMessage="Loading team members…"
        errorMessage={errorMessage}
        onRetry={() => void retry()}
        emptyTitle="No team members found"
        emptyDescription="Team members will appear here once facilities add users."
        emptyIcon={Users}
      >
        <UserStatsCards
          roleStats={roleStats}
          selectedRole={selectedRole}
          onRoleSelect={setSelectedRole}
        />
        <SearchFilterBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          selectedClinic={selectedClinic}
          onClinicChange={setSelectedClinic}
          clinics={clinics}
        />
        <UsersTableSection
          filteredUsers={filteredUsers}
          users={users}
          onViewUser={handleViewUser}
        />
      </DataState>

      <UserDetailsDialog
        open={isViewOpen}
        onOpenChange={setIsViewOpen}
        user={selectedUser}
      />
    </AppPageScaffold>
  );
}
