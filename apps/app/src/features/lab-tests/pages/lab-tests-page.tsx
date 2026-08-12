import { PageMeta } from "@/components/layout/page-meta";
import { Feature } from "@workspace/types";
import { FeatureGate } from "@/components/auth/feature-gate";
import { LabTestsPageUI } from "@/features/lab-tests/components/layout/lab-tests-page-ui";

export function LabTestsPage() {
  return (
    <>
      <PageMeta title="Lab Tests" description="Manage lab test records and results" />
      <FeatureGate feature={Feature.LAB_TESTS} showLockedCard>
        <LabTestsPageUI />
      </FeatureGate>
    </>
  );
}
