"use client";

import { Suspense } from "react";
import { LoadingState } from "@workspace/ui/components/empty-state";
import { FeatureGate } from "@/features/_shared/components/auth/feature-gate";
import { Feature } from "@workspace/types";
import { PatientsPageContainer } from "@/features/patients/components";

function PatientsPageFallback() {
  return <LoadingState message="Loading patients..." className="py-16" />;
}

export default function PatientsPage() {
  return (
    <FeatureGate feature={Feature.BASIC_PATIENT_MANAGEMENT} showLockedCard>
      <Suspense fallback={<PatientsPageFallback />}>
        <PatientsPageContainer />
      </Suspense>
    </FeatureGate>
  );
}
