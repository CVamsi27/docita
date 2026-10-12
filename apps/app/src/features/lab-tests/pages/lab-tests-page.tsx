import { PageMeta } from "@/components/layout/page-meta";
import { Feature } from "@workspace/types";
import { PageFeatureGate } from "@/components/auth/PageFeatureGate";
import { LabTestsPageUI } from "@/features/lab-tests/components/layout/lab-tests-page-ui";

export function LabTestsPage() {
  return (
    <>
      <PageMeta
        title="Lab Tests"
        description="Manage lab test records and results"
      />
      <PageFeatureGate
        feature={Feature.LAB_TESTS}
        title="Lab Tests"
        description="Manage laboratory test orders and results."
      >
        <LabTestsPageUI />
      </PageFeatureGate>
    </>
  );
}
