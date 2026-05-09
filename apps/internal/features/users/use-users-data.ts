import { useEffect, useMemo, useState } from "react";
import { getUserFacingErrorMessage } from "@workspace/types";
import { useAuth } from "@/lib/auth";
import { useInternalQuery } from "@/lib/use-internal-query";
import { fetchClinics, fetchUsersForSelection } from "./api";
import { calculateRoleStats, filterUsers } from "./utils";
import type { RoleFilter, User } from "./types";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";

export function useUsersData() {
  const { token } = useAuth();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClinic, setSelectedClinic] = useState("all");
  const [selectedRole, setSelectedRole] = useState<RoleFilter>("ALL");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  const clinicsQuery = useInternalQuery({
    queryKey: ["internal", "users", "clinics", token] as const,
    queryFn: fetchClinics,
  });

  const usersQuery = useInternalQuery({
    queryKey: [
      "internal",
      "users",
      token,
      selectedClinic,
      clinicsQuery.data?.length ?? 0,
    ] as const,
    queryFn: () =>
      fetchUsersForSelection(selectedClinic, clinicsQuery.data ?? []),
    enabled:
      Boolean(selectedClinic) &&
      (selectedClinic === "all" ? (clinicsQuery.data?.length ?? 0) > 0 : true),
  });

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
        fallback: "We could not load your team members. Please refresh and try again.",
      })
    : "We could not load your team members. Please refresh and try again.";

  return {
    clinics: clinicsQuery.data ?? [],
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
