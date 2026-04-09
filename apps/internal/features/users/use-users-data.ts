import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { fetchClinics, fetchUsersForSelection } from "./api";
import { calculateRoleStats, filterUsers } from "./utils";
import type { RoleFilter, User } from "./types";

export function useUsersData() {
  const { token } = useAuth();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClinic, setSelectedClinic] = useState("all");
  const [selectedRole, setSelectedRole] = useState<RoleFilter>("ALL");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  const clinicsQuery = useQuery({
    queryKey: ["internal", "users", "clinics", token],
    queryFn: fetchClinics,
    enabled: Boolean(token),
  });

  const usersQuery = useQuery({
    queryKey: [
      "internal",
      "users",
      token,
      selectedClinic,
      clinicsQuery.data?.length ?? 0,
    ],
    queryFn: () =>
      fetchUsersForSelection(selectedClinic, clinicsQuery.data ?? []),
    enabled:
      Boolean(token) &&
      Boolean(selectedClinic) &&
      (selectedClinic === "all" ? (clinicsQuery.data?.length ?? 0) > 0 : true),
  });

  useEffect(() => {
    if (clinicsQuery.error) {
      toast.error("Failed to load clinics");
    }
  }, [clinicsQuery.error]);

  useEffect(() => {
    if (usersQuery.error) {
      toast.error("Failed to load users");
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
  const errorMessage =
    (clinicsQuery.error as Error | null)?.message ||
    (usersQuery.error as Error | null)?.message ||
    "Failed to load team members";

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
