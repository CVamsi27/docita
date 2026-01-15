import { useClinicMembers } from "@/hooks/api/use-settings";

export const useMemberManagementLogic = () => {
  const { data: membersData, isLoading, error } = useClinicMembers();

  // In the future, we can add logic for:
  // - Searching/filtering members
  // - Opening "Invite Member" modal
  // - Handling member role updates

  const members = membersData ?? [];

  return {
    members,
    isLoading,
    error,
  };
};
