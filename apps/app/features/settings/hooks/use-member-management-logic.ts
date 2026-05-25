import { useClinicMembers } from "@workspace/data-access";

export const useMemberManagementLogic = () => {
  const { data: membersData, isLoading, error } = useClinicMembers();

  const members = membersData ?? [];

  return {
    members,
    isLoading,
    error,
  };
};
