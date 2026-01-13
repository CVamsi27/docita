import { apiHooks } from "@/lib/api-hooks";

export const useMemberManagementLogic = () => {
  const { data: membersData, isLoading, error } = apiHooks.useClinicMembers();

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
