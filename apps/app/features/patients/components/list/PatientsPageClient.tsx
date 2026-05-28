"use client";

import dynamic from "next/dynamic";
import { LoadingState } from "@workspace/ui/components/feedback/empty-state";

const DynamicPatientsPageContainer = dynamic(
  () =>
    import("@/features/patients/components/list/PatientsPageContainer").then(
      (mod) => mod.PatientsPageContainer,
    ),
  {
    ssr: false,
    loading: () => (
      <LoadingState message="Loading patients…" className="py-16" />
    ),
  },
);

export function PatientsPageClient() {
  return <DynamicPatientsPageContainer />;
}
