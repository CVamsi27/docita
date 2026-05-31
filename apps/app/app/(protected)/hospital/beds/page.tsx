"use client";

import { Feature } from "@workspace/types";
import { FeatureGate } from "@/components/auth/feature-gate";
import { useIpdLogic } from "@/features/ipd/hooks/use-ipd-logic";
import { BedManagementUI } from "@/features/ipd/components";

export default function BedManagementPage() {
  const {
    wards,
    isLoading,
    isError,
    refetch,
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
        isError={isError}
        onRetry={() => void refetch()}
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
