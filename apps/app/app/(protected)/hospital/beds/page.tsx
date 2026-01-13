"use client";

import { useIpdLogic } from "@/features/ipd/hooks/use-ipd-logic";
import { BedManagementUI } from "@/features/ipd/components";

export default function BedManagementPage() {
  const {
    wards,
    isLoading,
    stats,
    searchQuery,
    setSearchQuery,
    showAdmissionModal,
    setShowAdmissionModal,
  } = useIpdLogic();

  return (
    <BedManagementUI
      wards={wards}
      isLoading={isLoading}
      stats={stats}
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
      showAdmissionModal={showAdmissionModal}
      setShowAdmissionModal={setShowAdmissionModal}
    />
  );
}
