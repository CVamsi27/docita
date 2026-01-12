/**
 * Infinite Patients List - Container Component
 * Handles infinite scroll data fetching and navigation
 */

import { useRouter } from "next/navigation";
import { apiHooks } from "@/lib/api-hooks";
import { getInitials } from "@/features/_shared/utils";
import { getPatientAgeDisplay } from "../rules/patientRules";
import { InfinitePatientsListUI } from "./InfinitePatientsListUI";
import type { Patient } from "@workspace/types";

interface InfinitePatientsListContainerProps {
  searchQuery?: string;
  limit?: number;
}

export function InfinitePatientsListContainer({
  searchQuery,
  limit = 20,
}: InfinitePatientsListContainerProps) {
  const router = useRouter();

  // Use infinite patients query
  const { 
    data, 
    isLoading, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage 
  } = apiHooks.useInfinitePatients({
    search: searchQuery,
    limit,
  });

  const patients = data?.pages.flatMap((page) => page.items) || [];
  const hasMore = !!hasNextPage;

  const handlePatientClick = (patient: Patient) => {
    router.push(`/patients/${patient.id}`);
  };

  const handleLoadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const getPatientInitials = (patient: Patient) => {
    return getInitials(patient.firstName, patient.lastName);
  };

  const getPatientAge = (patient: Patient) => {
    return getPatientAgeDisplay(patient);
  };

  return (
    <InfinitePatientsListUI
      patients={patients}
      hasMore={hasMore}
      loading={isLoading}
      onPatientClick={handlePatientClick}
      onLoadMore={handleLoadMore}
      getPatientInitials={getPatientInitials}
      getPatientAge={getPatientAge}
    />
  );
}
