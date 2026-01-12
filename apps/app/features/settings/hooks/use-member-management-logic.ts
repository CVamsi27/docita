
import { apiHooks } from "@/lib/api-hooks";

export const useMemberManagementLogic = () => {
    const { data: doctors, isLoading, error } = apiHooks.useDoctors();

    // In the future, we can add logic for:
    // - Searching/filtering members
    // - Opening "Invite Member" modal
    // - Handling member role updates

    const members = doctors ?? [];

    return {
        members,
        isLoading,
        error,
    };
};
