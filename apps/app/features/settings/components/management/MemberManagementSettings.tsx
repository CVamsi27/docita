"use client";

import { FC } from "react";
import { useClinicSettings } from "@workspace/data-access";
import { useMemberManagementLogic } from "@/features/settings/hooks/use-member-management-logic";
import { MemberManagementUI } from "./MemberManagementUI";

export const MemberManagementSettings: FC = () => {
  const { data: clinic } = useClinicSettings();
  const { members, isLoading, error } = useMemberManagementLogic();

  return (
    <MemberManagementUI
      members={members}
      isLoading={isLoading}
      error={error}
      clinicId={clinic?.id}
      clinicReferralCode={clinic?.referralCode}
    />
  );
};
