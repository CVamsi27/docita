"use client";

import { Feature } from "@workspace/types";
import { FeatureGate } from "@/features/_shared/components/auth/feature-gate";
import { useIpdLogic } from "@/features/ipd/hooks/use-ipd-logic";
import { BedManagementUI, type WardInfo } from "@/features/ipd/components";

export default function BedManagementPage() {
  const {
    wards,
    isLoading,
    stats,
    searchQuery,
    setSearchQuery,
    showAdmissionModal,
    setShowAdmissionModal,
    admitPatient,
    isAdmitting,
  } = useIpdLogic();

  return (
    <FeatureGate feature={Feature.FULL_EHR} showLockedCard>
      <BedManagementUI
        wards={wards as WardInfo[] | undefined}
        isLoading={isLoading}
        stats={stats}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        showAdmissionModal={showAdmissionModal}
        setShowAdmissionModal={setShowAdmissionModal}
        onAdmitPatient={admitPatient}
        isAdmitting={isAdmitting}
      />
    </FeatureGate>
  );
}
