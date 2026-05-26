import { Suspense } from "react";
import { LoadingState } from "@workspace/ui/components/feedback/empty-state";
import { PatientsPageContainer } from "@/features/patients/components";

function PatientsPageFallback() {
  return <LoadingState message="Loading patients…" className="py-16" />;
}

export default function PatientsPage() {
  return (
    <Suspense fallback={<PatientsPageFallback />}>
      <PatientsPageContainer />
    </Suspense>
  );
}
