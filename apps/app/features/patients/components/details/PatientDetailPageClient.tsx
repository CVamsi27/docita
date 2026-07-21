"use client";

import dynamic from "next/dynamic";
import { AppPageScaffold, DataState } from "@workspace/ui/components";

const DynamicPatientDetailPageRoute = dynamic(
  () =>
    import("@/features/patients/components/details/PatientDetailPageContent").then(
      (mod) => mod.PatientDetailPageRoute,
    ),
  {
    ssr: false,
    loading: () => (
      <AppPageScaffold>
        <DataState
          status="loading"
          className="min-h-[50vh]"
          loadingMessage="Loading patient details…"
        />
      </AppPageScaffold>
    ),
  },
);

export function PatientDetailPageClient({ patientId }: { patientId: string }) {
  return <DynamicPatientDetailPageRoute patientId={patientId} />;
}
