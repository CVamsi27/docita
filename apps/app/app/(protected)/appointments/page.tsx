import { Suspense } from "react";
import { LoadingState } from "@workspace/ui/components/feedback/empty-state";
import PageContent from "@/features/appointments/components/AppointmentsPageContent";

function AppointmentsPageFallback() {
  return <LoadingState message="Loading appointments…" className="py-16" />;
}

export default function Page() {
  return (
    <Suspense fallback={<AppointmentsPageFallback />}>
      <PageContent />
    </Suspense>
  );
}
