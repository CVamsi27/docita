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
    queryKey: ["super-admin", "users", "clinics", token],
    queryFn: () => fetchClinics(token!),
    enabled: Boolean(token),
  });

  const usersQuery = useQuery({
    queryKey: [
      "super-admin",
      "users",
      token,
      selectedClinic,
      clinicsQuery.data?.length ?? 0,
    ],
    queryFn: () =>
      fetchUsersForSelection(token!, selectedClinic, clinicsQuery.data ?? []),
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
    setSearchTerm,
    setSelectedClinic,
    setSelectedRole,
    setIsViewOpen,
    handleViewUser,
  };
}
