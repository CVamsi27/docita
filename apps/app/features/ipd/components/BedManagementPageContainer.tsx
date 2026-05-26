"use client";

import { Feature } from "@workspace/types";
import { FeatureGate } from "@/components/auth/feature-gate";
import { useIpdLogic } from "@/features/ipd/hooks/use-ipd-logic";
import { BedManagementUI } from "@/features/ipd/components";

export function BedManagementPageContainer() {
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
        wards={wards}
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
