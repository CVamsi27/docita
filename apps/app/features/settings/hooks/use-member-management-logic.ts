import { useClinicMembers } from "@/hooks/api/use-settings";

export const useMemberManagementLogic = () => {
  const { data: membersData, isLoading, error } = useClinicMembers();

  const members = membersData ?? [];

  return {
    members,
    isLoading,
    error,
  };
};
