"use client";

import { FC } from "react";
import { useMemberManagementLogic } from "@/features/settings/hooks/use-member-management-logic";
import { MemberManagementUI } from "./MemberManagementUI";

export const MemberManagementSettings: FC = () => {
  const { members, isLoading, error } = useMemberManagementLogic();

  return (
    <MemberManagementUI members={members} isLoading={isLoading} error={error} />
  );
};
