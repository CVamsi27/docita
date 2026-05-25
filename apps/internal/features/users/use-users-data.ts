import { useEffect, useMemo, useState } from "react";
import { getUserFacingErrorMessage } from "@workspace/utils";
import { useAuth } from "@/lib/auth/auth";
import {
  useInternalClinics,
  useInternalUsersList,
} from "@workspace/data-access/internal";
import { calculateRoleStats, filterUsers } from "./utils";
import type { RoleFilter, User } from "./types";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";

export function useUsersData() {
  const { token } = useAuth();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClinic, setSelectedClinic] = useState("all");
  const [selectedRole, setSelectedRole] = useState<RoleFilter>("ALL");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  const clinicsQuery = useInternalClinics(token, "users");
  const clinics = clinicsQuery.data ?? [];

  const usersQuery = useInternalUsersList(token, selectedClinic, clinics);

  useEffect(() => {
    if (clinicsQuery.error) {
      showUserFacingErrorToast("We could not load clinics. Please try again.");
    }
  }, [clinicsQuery.error]);

  useEffect(() => {
    if (usersQuery.error) {
      showUserFacingErrorToast("We could not load users. Please try again.");
    }
  }, [usersQuery.error]);

  const users = useMemo(() => usersQuery.data ?? [], [usersQuery.data]);

  const filteredUsers = useMemo(
    () => filterUsers(users, searchTerm, selectedRole),
    [users, searchTerm, selectedRole],
  );

  const roleStats = useMemo(() => calculateRoleStats(users), [users]);

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setIsViewOpen(true);
  };

  const hasError = Boolean(clinicsQuery.error || usersQuery.error);
  const errorSource = clinicsQuery.error ?? usersQuery.error ?? null;
  const errorMessage = errorSource
    ? getUserFacingErrorMessage(errorSource, {
        context: "load",
        fallback:
          "We could not load your team members. Please refresh and try again.",
      })
    : "We could not load your team members. Please refresh and try again.";

  return {
    clinics,
    users,
    filteredUsers,
    roleStats,
    loading: clinicsQuery.isLoading || usersQuery.isLoading,
    searchTerm,
    selectedClinic,
    selectedRole,
    selectedUser,
    isViewOpen,
    hasError,
    errorMessage,
    setSearchTerm,
    setSelectedClinic,
    setSelectedRole,
    setIsViewOpen,
    handleViewUser,
    retry: async () => {
      await Promise.all([clinicsQuery.refetch(), usersQuery.refetch()]);
    },
  };
}
